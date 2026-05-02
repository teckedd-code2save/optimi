"""
Known-url extractor.

Returns hard-coded, verified opportunity data for a small set of trusted URLs.
This avoids network requests entirely for URLs we already know about.

Security note: matching is done by exact hostname (or hostname ending with the
registered domain). We never do substring matching on the full URL.
"""

import logging
from typing import Optional
from urllib.parse import urlparse

from ..models import ScrapedOpportunity
from .base import BaseExtractor

logger = logging.getLogger(__name__)

_KNOWN_URLS: dict[str, dict] = {
    "usaii-global-ai-hackathon-2026.devpost.com": {
        "title": "USAII Global Hackathon 2026",
        "organization": "USAII",
        "opportunity_type": "hackathon",
        "description": "Global virtual AI hackathon empowering students to build solutions for real-world good.",
        "deadline": "2026-06-06",
        "location": "Online",
        "prizes": "$15,000 in cash prizes + USAII AI Certification Scholarships",
        "requirements": [
            "Student or recent graduate",
            "Team of 2-5 members",
            "Project must use AI",
        ],
        "confidence": 1.0,
    },
    "speedrun.a16z.com": {
        "title": "a16z Speedrun SR007",
        "organization": "Andreessen Horowitz",
        "opportunity_type": "accelerator",
        "description": "10-week accelerator for AI and gaming startups. $750K investment on a $10M cap.",
        "deadline": "2026-05-17",
        "location": "San Francisco, CA",
        "prizes": "$750K at $10M cap",
        "requirements": [
            "Early-stage AI or gaming startup",
            "Working prototype",
            "Technical founder(s)",
        ],
        "confidence": 1.0,
    },
    "cloud.google.com/startup": {
        "title": "Google for Startups Cloud Credits",
        "organization": "Google",
        "opportunity_type": "grant",
        "description": "Up to $200,000 in Google Cloud credits for eligible startups.",
        "deadline": "2026-06-01",
        "location": "Global",
        "prizes": "Up to $200K cloud credits",
        "requirements": [
            "Seed to Series A stage",
            "Less than 5 years old",
            "Not previously received GCP credits",
        ],
        "confidence": 1.0,
    },
    "passport.mfa.gov.gh": {
        "title": "Ghana Passport Online Application",
        "organization": "Ministry of Foreign Affairs, Ghana",
        "opportunity_type": "government",
        "description": "Online passport application or renewal for Ghanaian citizens.",
        "deadline": None,
        "location": "Ghana",
        "prizes": None,
        "requirements": [
            "Ghanaian citizen",
            "Birth certificate",
            "Passport photos",
            "Witness (clergyman/public servant)",
        ],
        "confidence": 1.0,
    },
}


def _hostname_matches(hostname: str, key: str) -> bool:
    domain_part = key.split("/")[0].lower()
    host = hostname.lower()
    return host == domain_part or host.endswith("." + domain_part)


def _path_matches(path: str, key: str) -> bool:
    parts = key.split("/")
    if len(parts) <= 1:
        return True
    key_path = "/" + "/".join(parts[1:])
    return path == key_path or path.startswith(key_path + "/")


class KnownUrlsExtractor(BaseExtractor):
    """Return hard-coded data for verified, well-known opportunity URLs."""

    @property
    def name(self) -> str:
        return "known_urls"

    def can_handle(self, url: str) -> bool:
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname or ""
            path = parsed.path or "/"
            return any(
                _hostname_matches(hostname, key) and _path_matches(path, key)
                for key in _KNOWN_URLS.keys()
            )
        except Exception:
            return False

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("KnownUrlsExtractor: processing %s", url)
        try:
            parsed = urlparse(url)
            hostname = parsed.hostname or ""
            path = parsed.path or "/"
            for key, data in _KNOWN_URLS.items():
                if _hostname_matches(hostname, key) and _path_matches(path, key):
                    opp = ScrapedOpportunity(
                        source_url=url,
                        extraction_method=self.name,
                        confidence=data.get("confidence", 1.0),
                        title=data.get("title"),
                        organization=data.get("organization"),
                        opportunity_type=data.get("opportunity_type"),
                        description=data.get("description"),
                        deadline=data.get("deadline"),
                        location=data.get("location"),
                        prizes=data.get("prizes"),
                        requirements=data.get("requirements", []),
                        application_url=url,
                    )
                    logger.info("KnownUrlsExtractor: matched %s", key)
                    return opp
        except Exception as exc:
            logger.warning("KnownUrlsExtractor: error on %s: %s", url, exc)
        return None
