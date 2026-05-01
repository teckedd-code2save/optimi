"""
Command-line interface for the scraping engine.

Usage::

    # Single URL
    python -m scraper.cli scrape "https://example.com/hackathon"

    # Multiple URLs from a file
    python -m scraper.cli scrape-file urls.txt --output results.json

    # Interactive mode
    python -m scraper.cli interactive
"""

import argparse
import json
import logging
import sys
import time
from typing import List, Optional

from .engine import ScrapingEngine

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

def _setup_logging(level: int = logging.INFO) -> None:
    fmt = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
    logging.basicConfig(level=level, format=fmt, stream=sys.stderr)


# ---------------------------------------------------------------------------
# CLI commands
# ---------------------------------------------------------------------------

def cmd_scrape(args: argparse.Namespace) -> int:
    """Scrape a single URL."""
    engine = ScrapingEngine()
    result = engine.scrape(args.url)
    print(result.to_json(indent=args.indent))
    return 0


def cmd_scrape_file(args: argparse.Namespace) -> int:
    """Scrape multiple URLs from a text file (one per line)."""
    urls: List[str] = []
    try:
        with open(args.file, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if line and not line.startswith("#"):
                    urls.append(line)
    except FileNotFoundError:
        print(f"Error: file not found: {args.file}", file=sys.stderr)
        return 1

    if not urls:
        print("Error: no URLs found in file.", file=sys.stderr)
        return 1

    engine = ScrapingEngine()
    results = engine.scrape_multiple(urls)

    output_data = [r.to_dict() for r in results]
    json_out = json.dumps(output_data, indent=args.indent, ensure_ascii=False, default=str)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(json_out)
            fh.write("\n")
        print(f"Wrote {len(results)} results to {args.output}")
    else:
        print(json_out)

    return 0


def cmd_interactive(args: argparse.Namespace) -> int:
    """Interactive REPL-style scraping."""
    print("Interactive scraping mode. Type 'quit' to exit.")
    engine = ScrapingEngine()
    while True:
        try:
            url = input("URL> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0

        if url.lower() in ("quit", "exit", "q"):
            return 0
        if not url:
            continue

        result = engine.scrape(url)
        print(result.to_json(indent=args.indent))
        print()
        time.sleep(1)


# ---------------------------------------------------------------------------
# Argument parser
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="scraper",
        description="Scrape opportunity information from URLs.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python -m scraper.cli scrape 'https://example.com/hackathon'\n"
            "  python -m scraper.cli scrape-file urls.txt --output out.json\n"
            "  python -m scraper.cli interactive\n"
        ),
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Enable debug logging"
    )
    parser.add_argument(
        "--indent",
        type=int,
        default=2,
        help="JSON indentation level (default: 2)",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # scrape
    scrape_p = subparsers.add_parser("scrape", help="Scrape a single URL")
    scrape_p.add_argument("url", help="URL to scrape")
    scrape_p.set_defaults(func=cmd_scrape)

    # scrape-file
    sf_p = subparsers.add_parser("scrape-file", help="Scrape URLs from a file")
    sf_p.add_argument("file", help="Path to text file with one URL per line")
    sf_p.add_argument(
        "--output", "-o", default=None, help="Output JSON file (default: stdout)"
    )
    sf_p.set_defaults(func=cmd_scrape_file)

    # interactive
    int_p = subparsers.add_parser("interactive", help="Interactive scraping mode")
    int_p.set_defaults(func=cmd_interactive)

    return parser


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    level = logging.DEBUG if args.verbose else logging.INFO
    _setup_logging(level)

    if not hasattr(args, "func"):
        parser.print_help()
        return 1

    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
