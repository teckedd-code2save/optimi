"""
Reddit post extractor.

Reddit exposes a public JSON API by appending '.json' to any post URL.
This returns the full post data including title, selftext, subreddit,
author, and comments.
"""

import logging
from typing import Optional
from urllib.parse import urlparse

from ..models import ScrapedOpportunity
from ..utils import (
    clean_text,
    find_deadlines,
    normalize_deadline,
    classify_opportunity_type,
    extract_urls_from_text,
    get_retry_session,
    safe_get,
)
from .base import BaseExtractor

logger = logging.getLogger(__name__)


def is_reddit_url(url: str) -> bool:
    domain = urlparse(url).hostname or ""
    return domain.lower() in ("reddit.com", "www.reddit.com", "old.reddit.com")


def extract_post_id(url: str) -> Optional[str]:
    """Extract the Reddit post ID from a comments URL.

    Expected path: /r/subreddit/comments/POST_ID/...
    """
    try:
        path = urlparse(url).path
        parts = [p for p in path.split("/") if p]
        # parts: [r, subreddit, comments, post_id, slug]
        if len(parts) >= 4 and parts[0] == "r" and parts[2] == "comments":
            return parts[3]
    except Exception:
        pass
    return None


class RedditExtractor(BaseExtractor):
    """Extract opportunity data from Reddit post URLs."""

    @property
    def name(self) -> str:
        return "reddit"

    def can_handle(self, url: str) -> bool:
        return is_reddit_url(url)

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("RedditExtractor: processing %s", url)
        post_id = extract_post_id(url)

        opp = self._base_opportunity(url)
        opp.application_url = url

        json_url = url.rstrip("/") + ".json"
        session = get_retry_session(retries=1)
        resp = safe_get(session, json_url, timeout=12)
        if resp is None:
            logger.warning("RedditExtractor: failed to fetch %s", json_url)
            return self._fallback(url, post_id)

        try:
            data = resp.json()
        except Exception as exc:
            logger.debug("Reddit JSON parse failed: %s", exc)
            return self._fallback(url, post_id)

        # Reddit returns [post_listing, comment_listing]
        if not isinstance(data, list) or len(data) == 0:
            return self._fallback(url, post_id)

        post_data = data[0].get("data", {}).get("children", [{}])[0].get("data", {})
        if not post_data:
            return self._fallback(url, post_id)

        title = clean_text(post_data.get("title"))
        selftext = clean_text(post_data.get("selftext"))
        subreddit = post_data.get("subreddit")
        author = post_data.get("author")
        url_overridden = post_data.get("url_overridden_by_dest")

        opp.title = title
        opp.description = selftext or title
        opp.raw_text = selftext or title
        opp.organization = f"r/{subreddit}" if subreddit else None

        # If post links to an external URL, use it as application_url
        if url_overridden and url_overridden != url:
            opp.application_url = url_overridden

        # Try to extract opportunity links from selftext
        text = f"{title or ''} {selftext or ''}"
        urls = extract_urls_from_text(text)
        if urls and not opp.application_url:
            opp.application_url = urls[0]

        deadlines = find_deadlines(text)
        if deadlines:
            normalized = normalize_deadline(deadlines[0])
            if normalized:
                opp.deadline = normalized

        opp.opportunity_type = classify_opportunity_type(text)
        opp.confidence = 0.75 if selftext else 0.6
        logger.info("RedditExtractor: success for %s", url)
        return opp

    def _fallback(self, url: str, post_id: Optional[str]) -> ScrapedOpportunity:
        opp = self._base_opportunity(url)
        opp.application_url = url
        opp.extraction_method = "reddit_fallback"
        opp.confidence = 0.25
        if post_id:
            opp.title = "Reddit Post"
        return opp
