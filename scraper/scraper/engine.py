"""
Main scraping orchestrator.

The ``ScrapingEngine`` coordinates all extractors, determines which one
can handle a given URL, executes the best match, falls back to the generic
extractor on failure, and re-runs extraction when a redirect is resolved.
"""

import logging
import time
from typing import List, Optional, Type

from .models import ScrapedOpportunity
from .extractors.base import BaseExtractor
from .extractors.twitter import TwitterExtractor
from .extractors.twitter_api import TwitterAPIExtractor
from .extractors.generic import GenericExtractor
from .extractors.linkedin import LinkedInRedirectExtractor
from .extractors.google_forms import GoogleFormsExtractor
from .extractors.devpost import DevpostExtractor
from .extractors.known_urls import KnownUrlsExtractor
from .extractors.reddit import RedditExtractor
from .extractors.indiehackers import IndieHackersExtractor
from .extractors.hackernews import HackerNewsExtractor
from .extractors.github import GitHubExtractor
from .extractors.producthunt import ProductHuntExtractor

logger = logging.getLogger(__name__)

# Order matters — more specific extractors should come first.
# Optional API extractors (TwitterAPI, ProductHunt) are placed before
# their free counterparts so they take priority when credentials exist.
DEFAULT_EXTRACTORS: List[Type[BaseExtractor]] = [
    KnownUrlsExtractor,
    LinkedInRedirectExtractor,
    GoogleFormsExtractor,
    HackerNewsExtractor,
    GitHubExtractor,
    RedditExtractor,
    IndieHackersExtractor,
    ProductHuntExtractor,
    DevpostExtractor,
    TwitterAPIExtractor,
    TwitterExtractor,
    GenericExtractor,
]


class ScrapingEngine:
    """Orchestrate URL scraping across multiple platform-specific extractors.

    Basic usage::

        engine = ScrapingEngine()
        result = engine.scrape("https://usaii-global-ai-hackathon-2026.devpost.com/")
        print(result.to_json())
    """

    def __init__(self, extractors: Optional[List[Type[BaseExtractor]]] = None):
        """Initialise the engine.

        Args:
            extractors: Override the default extractor list.  If *None*, the
                built-in ordering is used.
        """
        self.extractors: List[BaseExtractor] = [
            cls() for cls in (extractors or DEFAULT_EXTRACTORS)
        ]
        logger.info(
            "ScrapingEngine initialised with %s extractors",
            [e.name for e in self.extractors],
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def scrape(self, url: str) -> ScrapedOpportunity:
        """Scrape a single URL and return the best available result.

        The algorithm is:
        1. Find the first extractor whose ``can_handle(url)`` returns *True*.
        2. Run it.
        3. If it returns *None*, try the generic extractor as fallback.
        4. If the result contains a resolved redirect URL that differs from
           the original, recursively scrape the resolved URL and merge.

        Args:
            url: The URL to scrape.

        Returns:
            A ``ScrapedOpportunity`` instance (never *None*).
        """
        if not url or not url.startswith(("http://", "https://")):
            logger.error("Invalid URL provided: %s", url)
            return self._error_result(url, "Invalid URL")

        logger.info("ScrapingEngine: start %s", url)

        best = self._run_extractors(url)

        # If the extractor resolved a redirect, follow it for richer data
        if (
            best
            and best.application_url
            and best.application_url != url
            and best.confidence < 0.6
        ):
            logger.info(
                "ScrapingEngine: following resolved URL %s", best.application_url
            )
            inner = self._run_extractors(best.application_url, skip_redirect=True)
            best = self._merge_results(best, inner)

        if best is None:
            best = self._error_result(url, "All extractors failed")

        logger.info(
            "ScrapingEngine: finished %s (method=%s confidence=%.2f)",
            url,
            best.extraction_method,
            best.confidence,
        )
        return best

    def scrape_multiple(self, urls: List[str]) -> List[ScrapedOpportunity]:
        """Scrape a list of URLs sequentially.

        A one-second delay is inserted between each request to be polite.

        Args:
            urls: List of URLs to scrape.

        Returns:
            List of ``ScrapedOpportunity`` results in the same order.
        """
        results: List[ScrapedOpportunity] = []
        for idx, url in enumerate(urls, 1):
            logger.info("ScrapingEngine: [%d/%d] %s", idx, len(urls), url)
            result = self.scrape(url)
            results.append(result)
            if idx < len(urls):
                time.sleep(1)
        return results

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _run_extractors(
        self, url: str, skip_redirect: bool = False
    ) -> Optional[ScrapedOpportunity]:
        """Iterate extractors and return the first successful result.

        Args:
            url: URL to process.
            skip_redirect: If *True*, skip the LinkedIn redirect extractor
                to avoid infinite loops.

        Returns:
            The best ``ScrapedOpportunity`` or *None*.
        """
        generic_result: Optional[ScrapedOpportunity] = None

        for extractor in self.extractors:
            if skip_redirect and extractor.name == "linkedin_redirect":
                continue

            if not extractor.can_handle(url):
                continue

            try:
                result = extractor.extract(url)
            except Exception as exc:
                logger.exception(
                    "Extractor %s crashed on %s: %s", extractor.name, url, exc
                )
                continue

            if result is None:
                continue

            # Always keep the generic result as ultimate fallback
            if extractor.name == "generic":
                generic_result = result
                continue

            # If we got a real result from a specialised extractor, use it
            if result.is_minimally_valid():
                return result

        # If no specialised extractor produced a valid result, return generic
        return generic_result

    @staticmethod
    def _merge_results(
        redirect_result: ScrapedOpportunity,
        resolved_result: ScrapedOpportunity,
    ) -> ScrapedOpportunity:
        """Merge a redirect resolver result with the resolved page result.

        The resolved page's fields take precedence, but we keep the
        original *source_url*.
        """
        merged = ScrapedOpportunity(
            source_url=redirect_result.source_url,
            extraction_method=f"{redirect_result.extraction_method}+{resolved_result.extraction_method}",
            confidence=max(redirect_result.confidence, resolved_result.confidence),
        )

        # Field-by-field merge (resolved takes precedence)
        for field_name in [
            "title",
            "organization",
            "opportunity_type",
            "description",
            "deadline",
            "location",
            "prizes",
            "application_url",
            "raw_text",
        ]:
            redirect_val = getattr(redirect_result, field_name)
            resolved_val = getattr(resolved_result, field_name)
            setattr(merged, field_name, resolved_val or redirect_val)

        # Requirements: combine both lists, deduplicate
        merged.requirements = list(
            dict.fromkeys(
                redirect_result.requirements + resolved_result.requirements
            )
        )

        return merged

    @staticmethod
    def _error_result(url: str, reason: str) -> ScrapedOpportunity:
        """Return a skeleton result indicating complete failure."""
        return ScrapedOpportunity(
            source_url=url,
            extraction_method="error",
            confidence=0.0,
            title=None,
            description=f"Could not extract any data from {url}. Reason: {reason}",
        )
