"""
Generic website extractor.

Handles any HTTP/HTTPS URL using *requests* + *BeautifulSoup4*.
Extracts page metadata (title, Open Graph, meta tags), searches for
structured data (JSON-LD), detects deadline patterns, and classifies
the opportunity type based on keyword matching.
"""

import logging
import time
import re
from typing import Optional, Dict, Any, List

from bs4 import BeautifulSoup

from ..models import ScrapedOpportunity
from ..utils import (
    get_retry_session,
    safe_get,
    clean_text,
    resolve_redirects,
    extract_domain,
    find_deadlines,
    normalize_deadline,
    classify_opportunity_type,
    extract_json_ld,
    extract_og_tags,
    extract_meta_tags,
    extract_urls_from_text,
)
from .base import BaseExtractor

logger = logging.getLogger(__name__)

# Prize/reward detection patterns
PRIZE_PATTERNS = [
    re.compile(r"(?:\$[\d,]+(?:\s*(?:USD|usd))?(?:\s*(?:prize|reward|pool|grant|credit))?)"),
    re.compile(r"(?:prize\s*pool\s*(?:of\s*)?[:\s]*[\d,]+)", re.IGNORECASE),
    re.compile(r"(?:\$[\d,.]+[KkMmBb]?(?:\s*(?:in\s+prizes|prize|grant|award))?)"),
    re.compile(r"(?:\d+\s*(?:million|billion|k)\s*(?:USD|dollars)?(?:\s*(?:prize|grant|pool))?)"),
]

# Location patterns
LOCATION_PATTERNS = [
    re.compile(r"(?:location|venue|where)\s*[:\s]+(.+?)(?:\n|$)", re.IGNORECASE),
]

# Requirement patterns
REQUIREMENT_PATTERNS = [
    re.compile(r"(?:who can apply|eligibility|requirements?|who should apply|criteria)\s*[:\s]*(.+?)(?:\n\n|\Z)", re.IGNORECASE | re.DOTALL),
]


class GenericExtractor(BaseExtractor):
    """Extract opportunity data from arbitrary web pages."""

    @property
    def name(self) -> str:
        return "generic"

    def can_handle(self, url: str) -> bool:
        # This is the catch-all extractor — it handles any HTTP(S) URL.
        return url.startswith(("http://", "https://"))

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("GenericExtractor: fetching %s", url)
        time.sleep(1)  # Rate limit

        session = get_retry_session()
        resp = safe_get(session, url, timeout=20)
        if resp is None:
            logger.warning("GenericExtractor: failed to fetch %s", url)
            return self._fallback_from_url(url)

        # Cloudflare / bot-protection check
        if resp.status_code == 403 or "cloudflare" in resp.text.lower()[:2000]:
            logger.warning("GenericExtractor: Cloudflare or 403 on %s", url)
            return self._fallback_from_url(url)

        try:
            soup = BeautifulSoup(resp.text, "lxml")
        except Exception as exc:
            logger.warning("GenericExtractor: parse error for %s: %s", url, exc)
            return self._fallback_from_url(url)

        opp = self._base_opportunity(url)
        opp.application_url = url

        # ------------------------------------------------------------------
        # 1. Basic page metadata
        # ------------------------------------------------------------------
        title_tag = soup.find("title")
        opp.title = clean_text(title_tag.get_text() if title_tag else None)

        meta = extract_meta_tags(soup)
        og = extract_og_tags(soup)

        if not opp.title and og.get("og:title"):
            opp.title = clean_text(og["og:title"])

        opp.description = clean_text(
            og.get("og:description") or meta.get("description")
        )

        # ------------------------------------------------------------------
        # 2. Raw text extraction
        # ------------------------------------------------------------------
        # Remove script/style tags before extracting text
        for junk in soup(["script", "style", "nav", "footer", "header"]):
            junk.decompose()
        raw = soup.get_text(separator="\n")
        opp.raw_text = clean_text(raw, max_length=8000)

        # ------------------------------------------------------------------
        # 3. Structured data (JSON-LD)
        # ------------------------------------------------------------------
        json_ld = extract_json_ld(soup)
        self._apply_json_ld(opp, json_ld)

        # ------------------------------------------------------------------
        # 4. Deadline detection
        # ------------------------------------------------------------------
        search_text = " ".join(
            filter(None, [opp.title, opp.description, opp.raw_text])
        )
        deadlines = find_deadlines(search_text)
        if deadlines:
            normalized = normalize_deadline(deadlines[0])
            if normalized:
                opp.deadline = normalized

        # ------------------------------------------------------------------
        # 5. Opportunity type classification
        # ------------------------------------------------------------------
        opp.opportunity_type = classify_opportunity_type(search_text)

        # ------------------------------------------------------------------
        # 6. Prizes / rewards
        # ------------------------------------------------------------------
        opp.prizes = self._extract_prizes(search_text)

        # ------------------------------------------------------------------
        # 7. Location
        # ------------------------------------------------------------------
        opp.location = self._extract_location(search_text)

        # ------------------------------------------------------------------
        # 8. Requirements
        # ------------------------------------------------------------------
        opp.requirements = self._extract_requirements(search_text)

        # ------------------------------------------------------------------
        # 9. Organization
        # ------------------------------------------------------------------
        if not opp.organization:
            opp.organization = self._extract_organization(soup, og, url)

        # ------------------------------------------------------------------
        # 10. Confidence scoring
        # ------------------------------------------------------------------
        opp.confidence = self._compute_confidence(opp)

        logger.info(
            "GenericExtractor: done %s (confidence=%.2f)", url, opp.confidence
        )
        return opp

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _fallback_from_url(self, url: str) -> ScrapedOpportunity:
        """Return a minimal result derived only from the URL itself.

        Used when the page cannot be fetched or parsed.
        Does NOT synthesise a fake title — that prevents callers from
        detecting true extraction failures.
        """
        opp = self._base_opportunity(url)
        domain = extract_domain(url)
        opp.organization = domain
        opp.description = f"Could not fetch details from {url}. The site may block automated access."
        opp.raw_text = opp.description
        opp.confidence = 0.05
        opp.extraction_method = "generic_fallback"
        return opp

    @staticmethod
    def _apply_json_ld(opp: ScrapedOpportunity, json_ld: List[Dict[str, Any]]) -> None:
        """Enrich *opp* using JSON-LD schema data."""
        for item in json_ld:
            item_type = item.get("@type", "")
            types = item_type if isinstance(item_type, list) else [item_type]

            for it in types:
                it_str = str(it).lower()
                # Event schema
                if "event" in it_str:
                    if not opp.title:
                        opp.title = clean_text(item.get("name"))
                    if not opp.description:
                        opp.description = clean_text(item.get("description"))
                    if not opp.deadline:
                        end_date = item.get("endDate") or item.get("deadline")
                        if end_date:
                            opp.deadline = normalize_deadline(str(end_date))
                    if not opp.location:
                        loc = item.get("location")
                        if isinstance(loc, dict):
                            opp.location = loc.get("name") or loc.get("address", {}).get("addressLocality")
                    if not opp.organization:
                        organizer = item.get("organizer")
                        if isinstance(organizer, dict):
                            opp.organization = organizer.get("name")
                # Organization schema
                elif "organization" in it_str and not opp.organization:
                    opp.organization = item.get("name")
                # WebSite / WebPage
                elif it_str in ("website", "webpage"):
                    if not opp.title:
                        opp.title = clean_text(item.get("name"))
                    if not opp.description:
                        opp.description = clean_text(item.get("description"))

    @staticmethod
    def _extract_prizes(text: str) -> Optional[str]:
        """Search *text* for prize/reward amounts."""
        matches: List[str] = []
        for pat in PRIZE_PATTERNS:
            for m in pat.finditer(text):
                candidate = m.group(0).strip()
                if candidate and candidate not in matches:
                    matches.append(candidate)
        return ", ".join(matches[:3]) if matches else None

    @staticmethod
    def _extract_location(text: str) -> Optional[str]:
        """Search *text* for location information."""
        for pat in LOCATION_PATTERNS:
            m = pat.search(text)
            if m:
                return clean_text(m.group(1))
        return None

    @staticmethod
    def _extract_requirements(text: str) -> List[str]:
        """Search *text* for requirement / eligibility text."""
        for pat in REQUIREMENT_PATTERNS:
            m = pat.search(text)
            if m:
                raw = m.group(1)
                # Split into bullet-like sentences
                parts = re.split(r"[\n•\-\*]+", raw)
                cleaned = [clean_text(p) for p in parts if clean_text(p)]
                return cleaned[:10]
        return []

    @staticmethod
    def _extract_organization(
        soup, og: Dict[str, str], url: str
    ) -> Optional[str]:
        """Try to determine the organization name."""
        # og:site_name
        site = og.get("og:site_name")
        if site:
            return site

        # <meta name="author">
        author_tag = soup.find("meta", attrs={"name": "author"})
        if author_tag:
            author = author_tag.get("content")
            if author:
                return author

        # From domain
        domain = extract_domain(url)
        if domain:
            # Capitalize and strip TLD roughly
            name = domain.split(".")[0].capitalize()
            return name

        return None

    @staticmethod
    def _compute_confidence(opp: ScrapedOpportunity) -> float:
        """Calculate a confidence score based on how many fields are filled."""
        score = 0.0
        if opp.title:
            score += 0.20
        if opp.description:
            score += 0.20
        if opp.opportunity_type:
            score += 0.15
        if opp.deadline:
            score += 0.15
        if opp.organization:
            score += 0.10
        if opp.prizes:
            score += 0.10
        if opp.location:
            score += 0.05
        if opp.requirements:
            score += 0.05
        return min(score, 1.0)
