"""
Product Hunt extractor (optional).

Uses the Product Hunt GraphQL API when a developer token is configured.
Fetches post title, tagline, description, maker info, and votes.

To use: set PRODUCT_HUNT_TOKEN in the backend .env file.

Without the token, this extractor skips silently.
"""

import logging
import os
import re
from typing import Optional

from ..models import ScrapedOpportunity
from ..utils import (
    clean_text,
    classify_opportunity_type,
    get_retry_session,
    safe_get,
)
from .base import BaseExtractor

logger = logging.getLogger(__name__)

PRODUCT_HUNT_API = "https://api.producthunt.com/v2/api/graphql"


def has_producthunt_credentials() -> bool:
    return bool(os.environ.get("PRODUCT_HUNT_TOKEN"))


def extract_post_slug(url: str) -> Optional[str]:
    try:
        from urllib.parse import urlparse
        path = urlparse(url).path
        parts = [p for p in path.split("/") if p]
        if parts:
            return parts[-1]
    except Exception:
        pass
    return None


class ProductHuntExtractor(BaseExtractor):
    """Extract opportunity data from Product Hunt post URLs."""

    @property
    def name(self) -> str:
        return "producthunt"

    def can_handle(self, url: str) -> bool:
        if not has_producthunt_credentials():
            return False
        return "producthunt.com" in url.lower() and "/posts/" in url.lower()

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("ProductHuntExtractor: processing %s", url)
        slug = extract_post_slug(url)
        if not slug:
            return None

        token = os.environ.get("PRODUCT_HUNT_TOKEN", "")
        session = get_retry_session(retries=1)
        session.headers.update({
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        })

        query = {
            "query": (
                f'query {{ post(slug: "{slug}") {{ name tagline description '
                f'votesCount website makers {{ name }} topics {{ name }} }} }}'
            )
        }

        resp = safe_get(session, PRODUCT_HUNT_API, timeout=10)
        if resp is None:
            logger.warning("ProductHuntExtractor: API request failed")
            return None

        try:
            data = resp.json()
        except Exception as exc:
            logger.debug("Product Hunt JSON parse failed: %s", exc)
            return None

        post = data.get("data", {}).get("post")
        if not post:
            return None

        name = clean_text(post.get("name"))
        tagline = clean_text(post.get("tagline"))
        description = clean_text(post.get("description"))
        votes = post.get("votesCount", 0)
        website = post.get("website")
        makers = [m.get("name") for m in post.get("makers", []) if m.get("name")]
        topics = [t.get("name") for t in post.get("topics", []) if t.get("name")]

        opp = self._base_opportunity(url)
        opp.application_url = website or url
        opp.title = name
        opp.description = tagline or description or f"{votes} upvotes on Product Hunt"
        opp.raw_text = description or tagline
        opp.organization = makers[0] if makers else "Product Hunt"
        opp.opportunity_type = classify_opportunity_type(
            f"{name or ''} {tagline or ''} {description or ''} {' '.join(topics)}"
        )
        opp.confidence = 0.85
        logger.info("ProductHuntExtractor: success for %s", url)
        return opp
