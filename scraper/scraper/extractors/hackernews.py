"""
Hacker News extractor.

Uses the public Algolia Search API (hn.algolia.com) which requires no
authentication. Searches HN for stories matching the given URL and returns
title, author, points, and comment count.

This is completely free and works for any public HN story.
"""

import logging
from typing import Optional
from urllib.parse import quote

from ..models import ScrapedOpportunity
from ..utils import (
    clean_text,
    classify_opportunity_type,
    get_retry_session,
    safe_get,
)
from .base import BaseExtractor

logger = logging.getLogger(__name__)

ALGOLIA_SEARCH = "https://hn.algolia.com/api/v1/search"


def is_hackernews_url(url: str) -> bool:
    return "news.ycombinator.com" in url.lower()


def extract_story_id(url: str) -> Optional[str]:
    """Extract the story ID from an HN item URL."""
    from urllib.parse import urlparse, parse_qs
    try:
        parsed = urlparse(url)
        if parsed.path.startswith("/item"):
            return parse_qs(parsed.query).get("id", [None])[0]
    except Exception:
        pass
    return None


class HackerNewsExtractor(BaseExtractor):
    """Extract opportunity data from Hacker News story URLs."""

    @property
    def name(self) -> str:
        return "hackernews"

    def can_handle(self, url: str) -> bool:
        return is_hackernews_url(url)

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("HackerNewsExtractor: processing %s", url)
        story_id = extract_story_id(url)

        opp = self._base_opportunity(url)
        opp.application_url = url

        session = get_retry_session(retries=1)

        # Strategy 1: If we have a story ID, fetch directly via Algolia
        if story_id:
            api_url = f"{ALGOLIA_SEARCH}?tags=story&query={story_id}"
        else:
            # Strategy 2: Search by URL
            api_url = f"{ALGOLIA_SEARCH}?tags=story&query={quote(url, safe='')}"

        resp = safe_get(session, api_url, timeout=10)
        if resp is None:
            logger.warning("HackerNewsExtractor: Algolia request failed")
            return self._fallback(url)

        try:
            data = resp.json()
        except Exception as exc:
            logger.debug("HN Algolia JSON parse failed: %s", exc)
            return self._fallback(url)

        hits = data.get("hits", [])
        if not hits:
            return self._fallback(url)

        # Find the best matching hit
        hit = hits[0]
        if story_id:
            for h in hits:
                if str(h.get("objectID")) == story_id:
                    hit = h
                    break

        title = clean_text(hit.get("title"))
        author = hit.get("author")
        points = hit.get("points", 0)
        num_comments = hit.get("num_comments", 0)
        story_url = hit.get("url") or url

        opp.title = title
        opp.organization = author
        opp.description = f"{points} points, {num_comments} comments on Hacker News"
        opp.raw_text = opp.description
        opp.application_url = story_url
        opp.opportunity_type = classify_opportunity_type(title or "")
        opp.confidence = 0.75
        logger.info("HackerNewsExtractor: success for %s", url)
        return opp

    def _fallback(self, url: str) -> ScrapedOpportunity:
        opp = self._base_opportunity(url)
        opp.application_url = url
        opp.extraction_method = "hackernews_fallback"
        opp.confidence = 0.25
        return opp
