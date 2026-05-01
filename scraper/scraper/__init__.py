"""
Opportunity Scraper — extract structured opportunity data from URLs.

Supports Twitter/X posts, hackathon pages, accelerator applications,
grant programs, LinkedIn redirects, Google Forms, and generic websites.

Basic usage::

    from scraper.engine import ScrapingEngine

    engine = ScrapingEngine()
    result = engine.scrape("https://example.com/hackathon")
    print(result.to_json())
"""

from .engine import ScrapingEngine
from .models import ScrapedOpportunity

__version__ = "0.1.0"
__all__ = ["ScrapingEngine", "ScrapedOpportunity"]
