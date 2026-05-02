"""
Indie Hackers post extractor.

Extracts post title, author, and content from Indie Hackers post URLs.
Uses BeautifulSoup to parse the HTML since there's no public JSON API.
"""

import logging
from typing import Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup

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


def is_indiehackers_url(url: str) -> bool:
    domain = urlparse(url).hostname or ""
    return domain.lower() in ("indiehackers.com", "www.indiehackers.com")


class IndieHackersExtractor(BaseExtractor):
    """Extract opportunity data from Indie Hackers post URLs."""

    @property
    def name(self) -> str:
        return "indiehackers"

    def can_handle(self, url: str) -> bool:
        return is_indiehackers_url(url)

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("IndieHackersExtractor: processing %s", url)

        opp = self._base_opportunity(url)
        opp.application_url = url

        session = get_retry_session(retries=1)
        resp = safe_get(session, url, timeout=12)
        if resp is None:
            logger.warning("IndieHackersExtractor: failed to fetch %s", url)
            return self._fallback(url)

        try:
            soup = BeautifulSoup(resp.text, "lxml")
        except Exception as exc:
            logger.debug("IndieHackersExtractor: parse error: %s", exc)
            return self._fallback(url)

        # Title: usually in <h1> or meta tag
        title_tag = soup.find("h1")
        title = clean_text(title_tag.get_text() if title_tag else None)
        if not title:
            og_title = soup.find("meta", property="og:title")
            title = clean_text(og_title.get("content") if og_title else None)

        # Author
        author_meta = soup.find("meta", attrs={"name": "author"})
        author = author_meta.get("content") if author_meta else None
        if not author:
            # Try to find author link
            author_link = soup.find("a", href=lambda x: x and "/user/" in x)
            if author_link:
                author = clean_text(author_link.get_text())

        # Description: first paragraph or meta description
        desc_meta = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
        description = clean_text(desc_meta.get("content") if desc_meta else None)

        if not description:
            first_p = soup.find("p")
            if first_p:
                description = clean_text(first_p.get_text())

        opp.title = title
        opp.description = description
        opp.raw_text = description
        opp.organization = author

        text = f"{title or ''} {description or ''}"
        urls = extract_urls_from_text(text)
        if urls and not opp.application_url:
            opp.application_url = urls[0]

        deadlines = find_deadlines(text)
        if deadlines:
            normalized = normalize_deadline(deadlines[0])
            if normalized:
                opp.deadline = normalized

        opp.opportunity_type = classify_opportunity_type(text)
        opp.confidence = 0.7 if title and description else 0.4
        logger.info("IndieHackersExtractor: done %s (conf=%.2f)", url, opp.confidence)
        return opp

    def _fallback(self, url: str) -> ScrapedOpportunity:
        opp = self._base_opportunity(url)
        opp.application_url = url
        opp.extraction_method = "indiehackers_fallback"
        opp.confidence = 0.2
        return opp
