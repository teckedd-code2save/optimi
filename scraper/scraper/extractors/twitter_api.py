"""
Twitter / X API v2 extractor (optional).

This extractor uses the official Twitter API v2 when a bearer token is
configured. It is significantly more reliable than oEmbed or syndication
for fetching tweet content, author info, and attached URLs.

To use: set TWITTER_BEARER_TOKEN in the backend .env file.

Without the token, this extractor silently skips and lets the standard
TwitterExtractor (oEmbed) handle the URL.
"""

import logging
import os
from typing import Optional

from ..models import ScrapedOpportunity
from ..utils import (
    clean_text,
    classify_opportunity_type,
    find_deadlines,
    normalize_deadline,
    extract_urls_from_text,
    get_retry_session,
    safe_get,
)
from .base import BaseExtractor

logger = logging.getLogger(__name__)

TWITTER_API_V2 = "https://api.twitter.com/2"


def has_twitter_credentials() -> bool:
    return bool(os.environ.get("TWITTER_BEARER_TOKEN"))


def extract_tweet_id(url: str) -> Optional[str]:
    try:
        from urllib.parse import urlparse
        path = urlparse(url).path
        parts = [p for p in path.split("/") if p]
        if len(parts) >= 3 and parts[1] == "status":
            return parts[2]
    except Exception:
        pass
    return None


class TwitterAPIExtractor(BaseExtractor):
    """Extract tweet data using the official Twitter API v2."""

    @property
    def name(self) -> str:
        return "twitter_api"

    def can_handle(self, url: str) -> bool:
        if not has_twitter_credentials():
            return False
        domain = url.split("/")[2].lower() if "//" in url else ""
        return domain in ("twitter.com", "x.com", "www.twitter.com", "www.x.com")

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("TwitterAPIExtractor: processing %s", url)
        tweet_id = extract_tweet_id(url)
        if not tweet_id:
            return None

        bearer = os.environ.get("TWITTER_BEARER_TOKEN", "")
        session = get_retry_session(retries=1)
        session.headers.update({"Authorization": f"Bearer {bearer}"})

        api_url = (
            f"{TWITTER_API_V2}/tweets/{tweet_id}"
            f"?tweet.fields=created_at,author_id,text,entities"
            f"&expansions=author_id"
            f"&user.fields=username,name"
        )

        resp = safe_get(session, api_url, timeout=10)
        if resp is None:
            logger.warning("TwitterAPIExtractor: API request failed")
            return None

        try:
            data = resp.json()
        except Exception as exc:
            logger.debug("Twitter API JSON parse failed: %s", exc)
            return None

        tweet_data = data.get("data", {})
        if not tweet_data:
            return None

        text = clean_text(tweet_data.get("text", ""))
        created_at = tweet_data.get("created_at")

        # Resolve author from includes
        author_name = None
        author_username = None
        author_id = tweet_data.get("author_id")
        for user in data.get("includes", {}).get("users", []):
            if user.get("id") == author_id:
                author_name = user.get("name")
                author_username = user.get("username")
                break

        opp = self._base_opportunity(url)
        opp.application_url = url
        opp.title = text[:120] if text else None
        opp.description = text
        opp.raw_text = text
        opp.organization = author_name or (f"@{author_username}" if author_username else None)

        if created_at:
            opp.deadline = created_at[:10]

        urls = extract_urls_from_text(text or "")
        if urls and not opp.application_url:
            opp.application_url = urls[0]

        deadlines = find_deadlines(text or "")
        if deadlines:
            normalized = normalize_deadline(deadlines[0])
            if normalized:
                opp.deadline = normalized

        opp.opportunity_type = classify_opportunity_type(text or "")
        opp.confidence = 0.9
        logger.info("TwitterAPIExtractor: success for %s", url)
        return opp
