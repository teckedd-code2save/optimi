"""
Twitter / X post extractor.

Uses multiple public strategies to extract tweet content without authentication:
1. Twitter Syndication API (cdn.syndication.twimg.com) — JSON, no auth, most reliable
2. oEmbed endpoint (publish.twitter.com) — HTML embed, public
3. URL-based fallback — username + tweet ID only
"""

import logging
import re
from typing import Optional

from bs4 import BeautifulSoup

from ..models import ScrapedOpportunity
from ..utils import (
    clean_text,
    is_twitter_url,
    extract_tweet_info,
    find_deadlines,
    normalize_deadline,
    classify_opportunity_type,
    extract_urls_from_text,
    get_retry_session,
    safe_get,
)
from .base import BaseExtractor

logger = logging.getLogger(__name__)

OEMBED_URL = "https://publish.twitter.com/oembed"
SYNDICATION_URL = "https://cdn.syndication.twimg.com/tweet-result"


class TwitterExtractor(BaseExtractor):
    """Extract opportunity data from a Twitter / X status URL."""

    @property
    def name(self) -> str:
        return "twitter"

    def can_handle(self, url: str) -> bool:
        return is_twitter_url(url)

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("TwitterExtractor: processing %s", url)
        username, tweet_id = extract_tweet_info(url)

        opp = self._base_opportunity(url)
        opp.application_url = url

        if username:
            opp.organization = f"@{username}"

        # ------------------------------------------------------------------
        # Attempt 1: Syndication API (public JSON, no auth)
        # ------------------------------------------------------------------
        synd_result = self._try_syndication(tweet_id) if tweet_id else None
        if synd_result:
            tweet_text, author_name, created_at = synd_result
            opp.description = tweet_text
            opp.raw_text = tweet_text
            if author_name and not opp.organization:
                opp.organization = author_name
            opp.confidence = 0.8
            self._enrich_from_text(opp)
            logger.info("TwitterExtractor: success via Syndication for %s", url)
            return opp

        # ------------------------------------------------------------------
        # Attempt 2: oEmbed API (public, no auth)
        # ------------------------------------------------------------------
        oembed_result = self._try_oembed(url)
        if oembed_result:
            tweet_text, author_name = oembed_result
            opp.description = tweet_text
            opp.raw_text = tweet_text
            if author_name and not opp.organization:
                opp.organization = author_name
            opp.confidence = 0.75
            self._enrich_from_text(opp)
            logger.info("TwitterExtractor: success via oEmbed for %s", url)
            return opp

        # ------------------------------------------------------------------
        # Fallback: URL-based partial extraction
        # ------------------------------------------------------------------
        logger.warning("TwitterExtractor: all methods failed for %s, returning partial", url)
        opp.description = (
            f"Twitter/X post by {username or 'unknown'}"
            f" (tweet ID: {tweet_id or 'unknown'})."
            " Unable to fetch content."
        )
        opp.raw_text = opp.description
        opp.confidence = 0.2
        opp.extraction_method = "twitter_fallback"
        return opp

    # ------------------------------------------------------------------
    # Syndication API helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _try_syndication(tweet_id: str) -> Optional[tuple]:
        """Call Twitter's public syndication endpoint and extract tweet data.

        Returns:
            Tuple of (tweet_text, author_name, created_at) or *None*.
        """
        session = get_retry_session(retries=1)
        api_url = f"{SYNDICATION_URL}?id={tweet_id}&lang=en"
        logger.debug("Trying syndication: %s", api_url)

        resp = safe_get(session, api_url, timeout=10)
        if resp is None:
            return None

        try:
            data = resp.json()
        except Exception as exc:
            logger.debug("Syndication JSON parse failed: %s", exc)
            return None

        text = data.get("text")
        if not text:
            # Some tweets have text in display_text_range format
            full_text = data.get("text", "")
            if not full_text:
                return None
            text = full_text

        author = data.get("user", {})
        author_name = author.get("name") or author.get("screen_name")
        created_at = data.get("created_at")

        cleaned = clean_text(text)
        if cleaned:
            return cleaned, author_name, created_at
        return None

    # ------------------------------------------------------------------
    # oEmbed helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _try_oembed(url: str) -> Optional[tuple]:
        """Call Twitter's public oEmbed endpoint and extract tweet text.

        Returns:
            Tuple of (tweet_text, author_name) or *None*.
        """
        from urllib.parse import quote

        session = get_retry_session(retries=1)
        api_url = f"{OEMBED_URL}?url={quote(url, safe='')}&omit_script=true&dnt=true"
        logger.debug("Trying oEmbed: %s", api_url)

        resp = safe_get(session, api_url, timeout=10)
        if resp is None:
            return None

        try:
            data = resp.json()
        except Exception as exc:
            logger.debug("oEmbed JSON parse failed: %s", exc)
            return None

        html = data.get("html")
        author_name = data.get("author_name")
        if not html:
            return None

        tweet_text = TwitterExtractor._parse_oembed_html(html)
        if tweet_text:
            return tweet_text, author_name
        return None

    @staticmethod
    def _parse_oembed_html(html: str) -> Optional[str]:
        """Extract plain tweet text from oEmbed HTML blockquote."""
        try:
            soup = BeautifulSoup(html, "html.parser")
            tweet_p = soup.find("p", class_=lambda x: x is None or "tweet" in x)
            if tweet_p:
                return clean_text(tweet_p.get_text(separator=" "))
            blockquote = soup.find("blockquote")
            if blockquote:
                first_p = blockquote.find("p")
                if first_p:
                    return clean_text(first_p.get_text(separator=" "))
        except Exception as exc:
            logger.debug("oEmbed HTML parse failed: %s", exc)
        return None

    # ------------------------------------------------------------------
    # Enrichment
    # ------------------------------------------------------------------

    @staticmethod
    def _enrich_from_text(opp: ScrapedOpportunity) -> None:
        """Derive additional fields from the tweet text."""
        text = opp.description or ""
        urls = extract_urls_from_text(text)
        if urls and not opp.application_url:
            opp.application_url = urls[0]

        deadlines = find_deadlines(text)
        if deadlines:
            normalized = normalize_deadline(deadlines[0])
            if normalized:
                opp.deadline = normalized

        opp.opportunity_type = classify_opportunity_type(text)

        if text:
            first_sentence = re.split(r"[.!?…]", text, maxsplit=1)[0].strip()
            opp.title = first_sentence[:120] if len(first_sentence) > 120 else first_sentence
