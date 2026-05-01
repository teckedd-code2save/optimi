"""
Base extractor class that all platform-specific extractors must inherit from.
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional

from ..models import ScrapedOpportunity

logger = logging.getLogger(__name__)


class BaseExtractor(ABC):
    """Abstract base class for all opportunity extractors.

    Concrete subclasses must implement the three abstract members:
    * ``name`` — a human-readable identifier,
    * ``can_handle(url)`` — whether this extractor understands the URL,
    * ``extract(url)`` — the actual extraction logic.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable name of the extractor (e.g. ``twitter``)."""
        ...

    @abstractmethod
    def can_handle(self, url: str) -> bool:
        """Return *True* if this extractor is capable of handling *url*.

        The check should be fast — ideally a regex or simple string test
        against the hostname / path.  No network calls.
        """
        ...

    @abstractmethod
    def extract(self, url: str) -> Optional[ScrapedOpportunity]:
        """Scrape *url* and return a populated ``ScrapedOpportunity``.

        If the extraction fails completely the method should return *None*
        rather than raise an exception.

        Args:
            url: The URL to scrape.

        Returns:
            A ``ScrapedOpportunity`` instance, or *None*.
        """
        ...

    def _base_opportunity(self, url: str) -> ScrapedOpportunity:
        """Return a minimal ``ScrapedOpportunity`` with boilerplate set.

        Subclasses can call this to obtain a skeleton object and then
        fill in the extracted fields.
        """
        return ScrapedOpportunity(
            source_url=url,
            extraction_method=self.name,
            confidence=0.0,
        )
