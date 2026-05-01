# Opportunity Scraper

A Python-based scraping engine that extracts and standardizes opportunity information from URLs. The engine handles various types of URLs including Twitter/X posts, hackathon pages, accelerator applications, grant programs, LinkedIn redirects, Google Forms, and generic websites.

## Features

- **Multi-platform support**: Extracts data from Twitter/X, LinkedIn redirects, Google Forms, and any generic web page
- **Nitter fallback**: Twitter/X extraction uses Nitter instances as fallback when direct scraping is blocked
- **Deadline detection**: Automatic detection of dates and deadlines using regex patterns
- **Opportunity classification**: Keyword-based classification into hackathon, accelerator, grant, job, platform, government categories
- **Structured data extraction**: Reads JSON-LD and Open Graph metadata
- **Robust error handling**: Retries, timeouts, graceful fallbacks, and comprehensive logging
- **CLI and Python API**: Use from the command line or import as a library

## Installation

```bash
pip install -r requirements.txt
```

## Supported URL Types

| URL Type | Example | Handler |
|---|---|---|
| Twitter/X posts | `x.com/user/status/123` | `TwitterExtractor` (via Nitter) |
| LinkedIn redirects | `linkedin.com/safety/go?url=...` | `LinkedInRedirectExtractor` |
| Google Forms | `forms.gle/xyz`, `docs.google.com/forms/...` | `GoogleFormsExtractor` |
| Generic websites | Any HTTP(S) URL | `GenericExtractor` |

## CLI Usage

### Scrape a single URL

```bash
python -m scraper.cli scrape "https://usaii-global-ai-hackathon-2026.devpost.com/"
```

### Scrape multiple URLs from a file

Create a file `urls.txt` with one URL per line:

```
https://x.com/NousResearch/status/2045225469088326039
https://usaii-global-ai-hackathon-2026.devpost.com/
https://speedrun.a16z.com/apply
```

Then run:

```bash
python -m scraper.cli scrape-file urls.txt --output results.json
```

### Interactive mode

```bash
python -m scraper.cli interactive
```

### Enable debug logging

Add `--verbose` or `-v` to any command:

```bash
python -m scraper.cli -v scrape "https://example.com/hackathon"
```

## Python API Usage

### Basic scraping

```python
from scraper.engine import ScrapingEngine

engine = ScrapingEngine()
result = engine.scrape("https://usaii-global-ai-hackathon-2026.devpost.com/")

# Access fields
print(result.title)
print(result.description)
print(result.deadline)

# Serialize to JSON
print(result.to_json())

# Convert to dict
print(result.to_dict())
```

### Batch scraping

```python
urls = [
    "https://x.com/NousResearch/status/2045225469088326039",
    "https://usaii-global-ai-hackathon-2026.devpost.com/",
    "https://speedrun.a16z.com/apply",
]

engine = ScrapingEngine()
results = engine.scrape_multiple(urls)

for r in results:
    print(f"{r.title} ({r.confidence:.0%} confidence)")
```

### Using individual extractors

```python
from scraper.extractors.twitter import TwitterExtractor

extractor = TwitterExtractor()
if extractor.can_handle("https://x.com/user/status/123"):
    result = extractor.extract("https://x.com/user/status/123")
    print(result.to_dict())
```

## Data Model

The standardized output is a `ScrapedOpportunity` dataclass:

| Field | Type | Description |
|---|---|---|
| `source_url` | `str` | Original URL scraped |
| `title` | `Optional[str]` | Title of the opportunity |
| `organization` | `Optional[str]` | Hosting organization |
| `opportunity_type` | `Optional[str]` | Category (hackathon, accelerator, grant, job, platform, government, other) |
| `description` | `Optional[str]` | Human-readable description |
| `deadline` | `Optional[str]` | ISO-8601 date string (e.g., `2026-05-17`) |
| `location` | `Optional[str]` | Physical or virtual location |
| `prizes` | `Optional[str]` | Prize/reward information |
| `requirements` | `List[str]` | Eligibility criteria |
| `application_url` | `Optional[str]` | Direct URL to apply/register |
| `raw_text` | `Optional[str]` | Unprocessed extracted text |
| `confidence` | `float` | 0.0-1.0 extraction quality score |
| `extraction_method` | `str` | Name of the extractor used |

## Architecture

```
scraper/
|-- __init__.py
|-- engine.py          # Main orchestrator
|-- models.py          # Data models
|-- utils.py           # URL parsing, text cleaning, deadline detection
|-- cli.py             # Command-line interface
|-- extractors/
|   |-- __init__.py
|   |-- base.py        # Base extractor class (ABC)
|   |-- twitter.py     # Twitter/X extractor (Nitter fallback)
|   |-- generic.py     # Generic website extractor (BeautifulSoup4)
|   |-- linkedin.py    # LinkedIn redirect resolver
|   |-- google_forms.py # Google Forms detector
```

## Running as a Server

The scraper can be exposed as a FastAPI server for the frontend to consume:

```bash
uvicorn api:app --host 0.0.0.0 --port 8000
```

Or from the project root:

```bash
uvicorn scraper.api:app --host 0.0.0.0 --port 8000
```

Endpoints:
- `POST /scrape` — Scrape a single URL
- `POST /scrape-batch` — Scrape multiple URLs
- `POST /api/ai/generate` — Generate AI drafts via OpenAI
- `GET /api/ai/status` — Check if AI is configured
- `GET /health` — Health check

For production deployment with automatic HTTPS, see the root [`DEPLOY.md`](../DEPLOY.md) which uses **Caddy** as the reverse proxy.

## License

MIT
