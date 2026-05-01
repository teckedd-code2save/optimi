"""
Data models for the scraping engine.

Defines the standardized ScrapedOpportunity dataclass used across all extractors.
"""

from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any
from datetime import datetime
import json


@dataclass
class ScrapedOpportunity:
    """Standardized schema for scraped opportunity data.

    All extractors must return an instance of this class, populated to the
    best of their ability. Fields should be left as None (or their default)
    when the extractor cannot determine a value.

    Attributes:
        source_url: The original URL that was scraped.
        title: Title or headline of the opportunity.
        organization: Name of the hosting organization.
        opportunity_type: Categorized type (e.g. 'hackathon', 'grant', 'job').
        description: Human-readable description or summary.
        deadline: ISO-8601 formatted date string (e.g. '2026-05-17').
        location: Physical or virtual location.
        prizes: Prize or reward information.
        requirements: List of requirements or eligibility criteria.
        application_url: Direct URL to apply or register.
        raw_text: Unprocessed text extracted from the page.
        confidence: 0.0-1.0 score indicating extraction quality.
        extraction_method: Name of the extractor that produced this result.
    """

    source_url: str
    title: Optional[str] = None
    organization: Optional[str] = None
    opportunity_type: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None
    location: Optional[str] = None
    prizes: Optional[str] = None
    requirements: List[str] = field(default_factory=list)
    application_url: Optional[str] = None
    raw_text: Optional[str] = None
    confidence: float = 0.0
    extraction_method: str = "unknown"

    def to_dict(self) -> Dict[str, Any]:
        """Convert the dataclass instance to a dictionary."""
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        """Serialize the instance to a JSON string."""
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False, default=str)

    def is_minimally_valid(self) -> bool:
        """Return True if the result has at least a title or description."""
        return bool(self.title) or bool(self.description) or bool(self.raw_text)
