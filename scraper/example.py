#!/usr/bin/env python3
"""
Example script demonstrating the scraping engine.

Scrapes a set of known URLs and prints the results as formatted JSON.
"""

import json
import logging
import sys
from pathlib import Path

# Ensure the scraper package can be imported from the parent directory
sys.path.insert(0, str(Path(__file__).parent))

from scraper.engine import ScrapingEngine

# ---------------------------------------------------------------------------
# Configure logging so we can see what the engine is doing
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    stream=sys.stderr,
)

# ---------------------------------------------------------------------------
# URLs to scrape — these are the real URLs from the conversation context
# ---------------------------------------------------------------------------

URLS = [
    "https://x.com/NousResearch/status/2045225469088326039",
    "https://usaii-global-ai-hackathon-2026.devpost.com/",
    "https://x.com/XiaomiMiMo/status/2048822064417755505",
    "https://speedrun.a16z.com/apply",
    "https://100t.xiaomimimo.com/",
    "https://forms.gle/57b4dHD7bAAwyv2R9",
]

# ---------------------------------------------------------------------------
# Run the scraper
# ---------------------------------------------------------------------------

def main() -> int:
    print("=" * 70, file=sys.stderr)
    print("Opportunity Scraper — Example Run", file=sys.stderr)
    print("=" * 70, file=sys.stderr)

    engine = ScrapingEngine()
    results = engine.scrape_multiple(URLS)

    # Print summary table
    print("\n--- Results Summary ---\n", file=sys.stderr)
    for r in results:
        status = "OK" if r.confidence > 0.2 else "LOW_CONFIDENCE"
        print(
            f"  [{status}] {r.extraction_method:20s}  "
            f"confidence={r.confidence:.2f}  {r.source_url}",
            file=sys.stderr,
        )

    # Output full JSON to stdout
    output = [r.to_dict() for r in results]
    print("\n--- Full Results (JSON) ---\n")
    print(json.dumps(output, indent=2, ensure_ascii=False, default=str))

    return 0


if __name__ == "__main__":
    sys.exit(main())
