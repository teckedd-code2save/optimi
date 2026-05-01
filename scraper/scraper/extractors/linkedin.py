"""
LinkedIn redirect resolver.

LinkedIn wraps external URLs in ``linkedin.com/safety/go?url=...`` links.
This extractor extracts the real destination URL, optionally follows the
redirect chain, and returns a minimal opportunity record pointing to the
resolved URL so the main engine can re-route it to the correct extractor.
"""

import logging
import time
from typing import Optional

from ..models import ScrapedOpportunity
from ..utils import (
    is_linkedin_redirect,
    extract_linkedin_redirect_url,
    get_retry_session,
    safe_get,
    resolve_redirects,
)
from .base import BaseExtractor

logger = logging.getLogger(__name__)


class LinkedInRedirectExtractor(BaseExtractor):
    """Resolve LinkedIn ``safety/go`` redirects to the real destination URL."""

    @property
    def name(self) -> str:
        return "linkedin_redirect"

    def can_handle(self, url: str) -> bool:
        return is_linkedin_redirect(url)

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("LinkedInRedirectExtractor: resolving %s", url)

        destination = extract_linkedin_redirect_url(url)
        if not destination:
            logger.warning("LinkedInRedirectExtractor: no destination in %s", url)
            return self._minimal_result(url, None)

        # Optionally verify the redirect by making a HEAD request
        try:
            time.sleep(1)
            session = get_retry_session(retries=2)
            final_url = resolve_redirects(session, destination)
        except Exception as exc:
            logger.debug("LinkedInRedirectExtractor: follow failed: %s", exc)
            final_url = destination

        logger.info(
            "LinkedInRedirectExtractor: %s -> %s", url, final_url
        )

        return self._minimal_result(url, final_url)

    @staticmethod
    def _minimal_result(
        original_url: str, resolved_url: Optional[str]
    ) -> ScrapedOpportunity:
        """Build a skeleton opportunity with redirect info.

        The engine will notice ``application_url`` differs from
        ``source_url`` and will usually run the resolved URL through the
        pipeline again to get full metadata.
        """
        opp = ScrapedOpportunity(
            source_url=original_url,
            extraction_method="linkedin_redirect",
            confidence=0.3 if resolved_url else 0.1,
            application_url=resolved_url or original_url,
            title="LinkedIn shared link",
            description=(
                f"LinkedIn redirect to {resolved_url}"
                if resolved_url
                else "LinkedIn redirect (destination unknown)"
            ),
        )
        return opp
