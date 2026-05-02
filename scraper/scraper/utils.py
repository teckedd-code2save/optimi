"""
Utility functions for URL parsing, text cleaning, deadline detection,
opportunity type classification, and HTTP request helpers.
"""

import re
import unicodedata
import logging
from typing import Optional, List, Dict, Any, Tuple
from urllib.parse import urlparse, urljoin, parse_qs, unquote
from datetime import datetime

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# HTTP session with retries & sensible defaults
# ---------------------------------------------------------------------------

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,application/xml;q=0.9,"
        "image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "DNT": "1",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
}


def get_retry_session(
    retries: int = 3,
    backoff_factor: float = 0.5,
    status_forcelist: Tuple[int, ...] = (429, 500, 502, 503, 504),
    timeout: int = 15,
) -> requests.Session:
    """Create a ``requests.Session`` with automatic retry logic.

    Args:
        retries: Maximum retry attempts.
        backoff_factor: Backoff multiplier for retries.
        status_forcelist: HTTP status codes that trigger a retry.
        timeout: Default timeout in seconds for each request.

    Returns:
        A configured ``requests.Session`` instance.
    """
    session = requests.Session()
    retry_strategy = Retry(
        total=retries,
        backoff_factor=backoff_factor,
        status_forcelist=list(status_forcelist),
        allowed_methods=["HEAD", "GET", "OPTIONS"],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    session.headers.update(DEFAULT_HEADERS)
    session.timeout = timeout  # type: ignore[attr-defined]
    return session


def safe_get(
    session: requests.Session,
    url: str,
    timeout: Optional[int] = None,
    allow_redirects: bool = True,
) -> Optional[requests.Response]:
    """Perform a GET request, returning *None* on any failure.

    Args:
        session: The session to use.
        url: Target URL.
        timeout: Override the session-level timeout.
        allow_redirects: Follow HTTP redirects.

    Returns:
        A ``Response`` object, or *None* if the request failed.
    """
    try:
        to = timeout or getattr(session, "timeout", 15)
        resp = session.get(url, timeout=to, allow_redirects=allow_redirects)
        if resp.status_code >= 400:
            logger.warning("HTTP %s for %s", resp.status_code, url)
            return None
        return resp
    except requests.RequestException as exc:
        logger.warning("Request failed for %s: %s", url, exc)
        return None


# ---------------------------------------------------------------------------
# URL helpers
# ---------------------------------------------------------------------------

def resolve_redirects(session: requests.Session, url: str) -> str:
    """Follow HTTP redirects and return the final URL.

    Args:
        session: HTTP session.
        url: Starting URL.

    Returns:
        The final URL after following all redirects.
    """
    try:
        resp = session.head(url, allow_redirects=True, timeout=15)
        return resp.url
    except requests.RequestException:
        return url


def extract_domain(url: str) -> str:
    """Return the registered domain (e.g. ``runwayml.com``) for *url*."""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        # Strip leading www.
        if hostname.startswith("www."):
            hostname = hostname[4:]
        return hostname
    except Exception:
        return ""


def is_twitter_url(url: str) -> bool:
    """Return True if *url* points to Twitter or X."""
    domain = extract_domain(url)
    return domain in ("twitter.com", "x.com", "mobile.twitter.com")


def is_linkedin_redirect(url: str) -> bool:
    """Return True if *url* is a LinkedIn safety/redirect link."""
    domain = extract_domain(url)
    return domain == "linkedin.com" and "/safety/go" in url


def is_google_forms_url(url: str) -> bool:
    """Return True if *url* is a Google Forms link."""
    domain = extract_domain(url)
    return domain in ("forms.gle", "docs.google.com") and "forms" in url


def is_devpost_url(url: str) -> bool:
    """Return True if *url* points to Devpost."""
    domain = extract_domain(url)
    return domain in ("devpost.com", "devpost.io") or domain.endswith(".devpost.com") or domain.endswith(".devpost.io")


def is_reddit_url(url: str) -> bool:
    """Return True if *url* points to Reddit."""
    domain = extract_domain(url)
    return domain in ("reddit.com", "www.reddit.com", "old.reddit.com")


def is_indiehackers_url(url: str) -> bool:
    """Return True if *url* points to Indie Hackers."""
    domain = extract_domain(url)
    return domain in ("indiehackers.com", "www.indiehackers.com")


def extract_tweet_info(url: str) -> Tuple[Optional[str], Optional[str]]:
    """Parse a Twitter/X URL and return (username, tweet_id) if possible.

    Returns:
        Tuple of (username, tweet_id) or (None, None) on parse failure.
    """
    try:
        parsed = urlparse(url)
        path_parts = [p for p in parsed.path.split("/") if p]
        # Expected: /username/status/1234567890
        if len(path_parts) >= 3 and path_parts[1] == "status":
            username = path_parts[0]
            tweet_id = path_parts[2]
            return username, tweet_id
    except Exception as exc:
        logger.debug("Failed to parse tweet URL %s: %s", url, exc)
    return None, None


def extract_linkedin_redirect_url(url: str) -> Optional[str]:
    """Extract the destination URL from a LinkedIn ``/safety/go`` link.

    Args:
        url: LinkedIn redirect URL.

    Returns:
        The destination URL or *None* if it cannot be extracted.
    """
    try:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        if "url" in params:
            return unquote(params["url"][0])
    except Exception as exc:
        logger.debug("Failed to parse LinkedIn redirect %s: %s", url, exc)
    return None


# ---------------------------------------------------------------------------
# Text cleaning
# ---------------------------------------------------------------------------

def clean_text(text: Optional[str], max_length: Optional[int] = 5000) -> Optional[str]:
    """Normalize whitespace, strip junk, and optionally truncate *text*.

    Args:
        text: Raw text input.
        max_length: Maximum length to return (None for unlimited).

    Returns:
        Cleaned text, or *None* if the input was empty/whitespace.
    """
    if not text:
        return None
    # Normalize unicode (e.g. smart quotes -> ASCII)
    cleaned = unicodedata.normalize("NFKC", text)
    # Collapse all whitespace runs to a single space
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = cleaned.strip()
    if not cleaned:
        return None
    if max_length and len(cleaned) > max_length:
        cleaned = cleaned[:max_length].rsplit(" ", 1)[0] + "..."
    return cleaned


def extract_urls_from_text(text: str) -> List[str]:
    """Return a list of HTTP(S) URLs found inside *text*."""
    pattern = re.compile(r"https?://[^\s\"'<>)»]+", re.IGNORECASE)
    return pattern.findall(text)


# ---------------------------------------------------------------------------
# Deadline detection
# ---------------------------------------------------------------------------

DEADLINE_PATTERNS = [
    # ISO: 2026-05-17 or 2026/05/17
    re.compile(r"\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b"),
    # US: May 17, 2026 or May 17 2026
    re.compile(
        r"\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*"
        r"\.?\s+\d{1,2}[,.]?\s+\d{4})\b",
        re.IGNORECASE,
    ),
    # EU: 17/05/2026 or 17-05-2026
    re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b"),
    # Named phrases
    re.compile(r"(?:deadline|due|apply by|applications? close|submissions? due)\s*:?\s*(.+?)(?:\n|$)", re.IGNORECASE),
]

DEADLINE_KEYWORDS = [
    "deadline", "due by", "due on", "apply by", "application deadline",
    "applications close", "submissions due", "register by", "submission deadline",
    "closes on", "ends on", "last day to apply", "final date",
]


def find_deadlines(text: str) -> List[str]:
    """Scan *text* for date strings that likely represent deadlines.

    Returns:
        List of candidate deadline strings.
    """
    if not text:
        return []
    candidates: List[str] = []
    for pat in DEADLINE_PATTERNS:
        for match in pat.finditer(text):
            candidate = match.group(1).strip()
            if candidate and candidate not in candidates:
                candidates.append(candidate)
    return candidates


def normalize_deadline(date_str: str) -> Optional[str]:
    """Try to convert a raw date string to ISO-8601 format.

    Args:
        date_str: A date string in various formats.

    Returns:
        ISO date string (YYYY-MM-DD) or *None* if parsing fails.
    """
    from dateutil import parser as date_parser

    try:
        dt = date_parser.parse(date_str, fuzzy=True)
        return dt.strftime("%Y-%m-%d")
    except (ValueError, TypeError, OverflowError):
        logger.debug("Could not parse date: %s", date_str)
        return None


# ---------------------------------------------------------------------------
# Opportunity type classification
# ---------------------------------------------------------------------------

TYPE_KEYWORDS: Dict[str, List[str]] = {
    "hackathon": [
        "hackathon", "hack", "buildathon", "codeathon", "demo day",
        "prototype", "coding competition", "hackfest", "codefest",
    ],
    "accelerator": [
        "accelerator", "accelerate", "cohort", "batch", "funding",
        "investment", "seed", "venture", "vc", "demo day",
        "startup program", "incubator", "startup",
    ],
    "grant": [
        "grant", "token", "credits", "funding", "award", "scholarship",
        "stipend", "bounty", "prize pool", "prizes",
    ],
    "job": [
        "career", "hiring", "join our team", "position", "job",
        "employment", "full-time", "part-time", "contract", "role",
        "we are looking for", "talent", "open role", "recruiting",
    ],
    "platform": [
        "platform", "subscribe", "signup", "sign up", "launch",
        "early access", "waitlist", "beta", "new product",
        "try it now", "get started",
    ],
    "government": [
        "passport", "visa", "government", "ministry", "public sector",
        "federal", "state program", "official",
    ],
}


def classify_opportunity_type(text: Optional[str]) -> Optional[str]:
    """Classify the opportunity type based on keyword matching.

    Args:
        text: Title + description text to analyse.

    Returns:
        The best-matching type key, or *None* if no keywords match.
    """
    if not text:
        return None
    text_lower = text.lower()
    scores: Dict[str, int] = {}
    for opp_type, keywords in TYPE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score:
            scores[opp_type] = score
    if not scores:
        return None
    return max(scores, key=scores.get)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# Structured data helpers (JSON-LD / microdata)
# ---------------------------------------------------------------------------

def extract_json_ld(soup) -> List[Dict[str, Any]]:
    """Extract all JSON-LD schema blocks from a BeautifulSoup document.

    Args:
        soup: Parsed BeautifulSoup object.

    Returns:
        List of decoded JSON-LD dictionaries.
    """
    import json

    results: List[Dict[str, Any]] = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, dict):
                results.append(data)
            elif isinstance(data, list):
                results.extend(data)
        except (json.JSONDecodeError, TypeError):
            continue
    return results


def extract_og_tags(soup) -> Dict[str, str]:
    """Extract Open Graph meta tags from a BeautifulSoup document.

    Returns:
        Dictionary mapping OG property names to content values.
    """
    og: Dict[str, str] = {}
    for tag in soup.find_all("meta", property=lambda p: p and p.startswith("og:")):
        prop = tag.get("property", "")
        content = tag.get("content", "")
        if prop and content:
            og[prop] = content
    return og


def extract_meta_tags(soup) -> Dict[str, str]:
    """Extract standard meta description / keywords tags.

    Returns:
        Dictionary of meta name -> content.
    """
    meta: Dict[str, str] = {}
    for tag in soup.find_all("meta", attrs={"name": True}):
        name = tag.get("name", "").lower()
        content = tag.get("content", "")
        if name in ("description", "keywords", "author") and content:
            meta[name] = content
    return meta
