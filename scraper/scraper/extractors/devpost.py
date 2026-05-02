"""
Devpost hackathon extractor.

Extracts a hackathon name from the URL path and returns a typed opportunity
record. Devpost pages are often blocked by bot protection, so this extractor
relies primarily on URL structure rather than page content.
"""

import logging
from typing import Optional

from ..models import ScrapedOpportunity
from ..utils import is_devpost_url, extract_domain
from .base import BaseExtractor

logger = logging.getLogger(__name__)

# Path segments that are never hackathon slugs
_SKIP_SEGMENTS = {
    "hackathons",
    "hackathon",
    "projects",
    "project",
    "software",
    "users",
    "user",
    "teams",
    "team",
    "discussions",
    "jobs",
    "challenges",
    "challenge",
    "collections",
    "collection",
    "dashboard",
    "settings",
    "account",
    "auth",
    "login",
    "register",
    "search",
    "tags",
    "tag",
}


class DevpostExtractor(BaseExtractor):
    """Extract opportunity data from Devpost hackathon URLs."""

    @property
    def name(self) -> str:
        return "devpost"

    def can_handle(self, url: str) -> bool:
        return is_devpost_url(url)

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("DevpostExtractor: processing %s", url)

        opp = self._base_opportunity(url)
        opp.application_url = url
        opp.opportunity_type = "hackathon"

        slug = self._extract_slug(url)
        if slug:
            hackathon_name = slug.replace("-", " ").title()
            opp.title = f"{hackathon_name} Hackathon"
            opp.confidence = 0.6
        else:
            opp.title = "Devpost Hackathon"
            opp.confidence = 0.3

        # Try to infer organisation from subdomain (e.g. usaii-global-ai-hackathon-2026.devpost.com)
        domain = extract_domain(url)
        parts = domain.split(".")
        if len(parts) > 2 and parts[0] not in ("www", "devpost"):
            opp.organization = parts[0].replace("-", " ").title()

        logger.info("DevpostExtractor: done %s (title=%s)", url, opp.title)
        return opp

    @staticmethod
    def _extract_slug(url: str) -> Optional[str]:
        """Return the hackathon slug from the URL path, or None."""
        from urllib.parse import urlparse

        try:
            parsed = urlparse(url)
            path_parts = [p for p in parsed.path.split("/") if p]
            for part in path_parts:
                if part.lower() not in _SKIP_SEGMENTS:
                    return part
        except Exception as exc:
            logger.debug("Failed to extract Devpost slug from %s: %s", url, exc)
        return None
