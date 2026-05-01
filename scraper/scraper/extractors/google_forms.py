"""
Google Forms detector.

Identifies ``forms.gle`` shortlinks and ``docs.google.com/forms`` URLs.
Attempts to fetch the form and extract the title / description from the
page markup.  Google Forms are flagged as opportunity_type ``platform``
since they usually represent signup, registration, or application forms.
"""

import logging
import time
from typing import Optional

from bs4 import BeautifulSoup

from ..models import ScrapedOpportunity
from ..utils import (
    get_retry_session,
    safe_get,
    clean_text,
    is_google_forms_url,
    classify_opportunity_type,
    find_deadlines,
    normalize_deadline,
)
from .base import BaseExtractor

logger = logging.getLogger(__name__)


class GoogleFormsExtractor(BaseExtractor):
    """Detect and extract metadata from Google Forms URLs."""

    @property
    def name(self) -> str:
        return "google_forms"

    def can_handle(self, url: str) -> bool:
        return is_google_forms_url(url)

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("GoogleFormsExtractor: processing %s", url)

        opp = self._base_opportunity(url)
        opp.application_url = url
        opp.opportunity_type = "platform"

        time.sleep(1)
        session = get_retry_session()
        resp = safe_get(session, url, timeout=15)

        if resp is None:
            logger.warning("GoogleFormsExtractor: cannot fetch %s", url)
            opp.title = "Google Form"
            opp.description = "Google Forms application/registration form."
            opp.confidence = 0.2
            return opp

        try:
            soup = BeautifulSoup(resp.text, "lxml")
        except Exception as exc:
            logger.warning("GoogleFormsExtractor: parse error %s: %s", url, exc)
            opp.title = "Google Form"
            opp.confidence = 0.2
            return opp

        # ------------------------------------------------------------------
        # Title extraction
        # ------------------------------------------------------------------
        # Google Forms puts the form title in <meta property="og:title">
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            opp.title = clean_text(og_title["content"])
        else:
            # Fallback: <title> tag
            title_tag = soup.find("title")
            if title_tag:
                opp.title = clean_text(title_tag.get_text())

        # ------------------------------------------------------------------
        # Description extraction
        # ------------------------------------------------------------------
        og_desc = soup.find("meta", property="og:description")
        if og_desc and og_desc.get("content"):
            opp.description = clean_text(og_desc["content"])
        else:
            # Try to find the form description in the freebird class
            desc_div = soup.find("div", class_=lambda c: c and "freebirdFormviewerViewDescription" in c)
            if desc_div:
                opp.description = clean_text(desc_div.get_text())

        if not opp.description:
            opp.description = "Google Forms application/registration form."

        # ------------------------------------------------------------------
        # Raw text
        # ------------------------------------------------------------------
        raw = soup.get_text(separator="\n")
        opp.raw_text = clean_text(raw, max_length=4000)

        # ------------------------------------------------------------------
        # Deadline detection in description
        # ------------------------------------------------------------------
        search_text = " ".join(filter(None, [opp.title, opp.description, opp.raw_text]))
        deadlines = find_deadlines(search_text)
        if deadlines:
            normalized = normalize_deadline(deadlines[0])
            if normalized:
                opp.deadline = normalized

        # Override type if content suggests something more specific
        detected_type = classify_opportunity_type(search_text)
        if detected_type:
            opp.opportunity_type = detected_type

        # ------------------------------------------------------------------
        # Confidence
        # ------------------------------------------------------------------
        if opp.title and opp.description and opp.description != "Google Forms application/registration form.":
            opp.confidence = 0.7
        elif opp.title:
            opp.confidence = 0.5
        else:
            opp.confidence = 0.3

        logger.info(
            "GoogleFormsExtractor: done %s (confidence=%.2f)", url, opp.confidence
        )
        return opp
