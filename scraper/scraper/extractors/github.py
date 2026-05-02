"""
GitHub extractor.

Uses the public GitHub REST API (no auth needed for 60 requests/hour).
Extracts title, body, author, and labels from issues, pull requests, and
discussions.
"""

import logging
import re
from typing import Optional

from ..models import ScrapedOpportunity
from ..utils import (
    clean_text,
    classify_opportunity_type,
    find_deadlines,
    normalize_deadline,
    get_retry_session,
    safe_get,
)
from .base import BaseExtractor

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"

_GITHUB_PATH_RE = re.compile(
    r"github\.com/(?P<owner>[^/]+)/(?P<repo>[^/]+)/(?:issues|pull)/(?P<number>\d+)"
)


def parse_github_url(url: str) -> Optional[dict]:
    m = _GITHUB_PATH_RE.search(url)
    if m:
        return m.groupdict()
    return None


class GitHubExtractor(BaseExtractor):
    """Extract opportunity data from GitHub issue/PR URLs."""

    @property
    def name(self) -> str:
        return "github"

    def can_handle(self, url: str) -> bool:
        return "github.com" in url and ("/issues/" in url or "/pull/" in url)

    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        logger.info("GitHubExtractor: processing %s", url)
        parsed = parse_github_url(url)
        if not parsed:
            return self._fallback(url)

        owner = parsed["owner"]
        repo = parsed["repo"]
        number = parsed["number"]
        is_pr = "/pull/" in url

        endpoint = f"{GITHUB_API}/repos/{owner}/{repo}/issues/{number}"
        session = get_retry_session(retries=1)
        resp = safe_get(session, endpoint, timeout=10)
        if resp is None:
            logger.warning("GitHubExtractor: API request failed")
            return self._fallback(url)

        try:
            data = resp.json()
        except Exception as exc:
            logger.debug("GitHub JSON parse failed: %s", exc)
            return self._fallback(url)

        title = clean_text(data.get("title"))
        body = clean_text(data.get("body"), max_length=2000)
        author = data.get("user", {}).get("login")
        labels = [label.get("name", "") for label in data.get("labels", [])]
        state = data.get("state")
        created = data.get("created_at")

        opp = self._base_opportunity(url)
        opp.application_url = url
        opp.title = title
        opp.organization = f"{owner}/{repo}"
        opp.description = body or f"GitHub {'PR' if is_pr else 'issue'} by @{author}"
        opp.raw_text = body

        text = f"{title or ''} {body or ''}"
        deadlines = find_deadlines(text)
        if deadlines:
            normalized = normalize_deadline(deadlines[0])
            if normalized:
                opp.deadline = normalized

        opp.opportunity_type = classify_opportunity_type(text)
        opp.confidence = 0.8 if body else 0.6
        logger.info("GitHubExtractor: success for %s", url)
        return opp

    def _fallback(self, url: str) -> ScrapedOpportunity:
        opp = self._base_opportunity(url)
        opp.application_url = url
        opp.extraction_method = "github_fallback"
        opp.confidence = 0.25
        return opp
