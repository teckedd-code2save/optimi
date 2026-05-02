# Optimi — Opportunity Tracker

[![Build](https://img.shields.io/badge/build-passing-success)](https://github.com/yourusername/opportunity-hook)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Optimi** is a lightweight, privacy-first Progressive Web App (PWA) for tracking opportunities — hackathons, grants, accelerators, jobs, and more. It includes a curated opportunity finder, an AI application-assistant, a visual pipeline dashboard, and a Python scraping engine for extracting structured data from URLs.

![Optimi Screenshot](app/public/apple-touch-icon.png)

## Features

### Pipeline Dashboard
- **Kanban board** with 8 status columns: *Saved → Researching → Preparing → Applied → Interview → Accepted → Rejected → Declined*
- Drag cards between columns to track progress
- Per-card checklists, notes, deadline tracking, and prize/location metadata
- Quick filters by status and opportunity type

### Smart Extract
Paste any URL and automatically extract:
- Title, organization, description
- Deadline (ISO date detection from page text)
- Prize pool / grant amount
- Location (online or physical)
- Opportunity type classification (hackathon, grant, accelerator, job, government, platform)

**Extraction strategies** (tried in order):
1. **Known URL database** — instant lookup for verified opportunities (no network needed)
2. **Platform APIs** — Hacker News (Algolia), GitHub Issues/PRs, Reddit (browser JSON), Twitter oEmbed
3. **Backend scraper** — full server-side HTML parsing with BeautifulSoup4 (requires self-hosted backend)
4. **Client-side generic parser** — fetches via public CORS proxies and parses with DOMParser
5. **URL-pattern parsers** — Devpost, LinkedIn redirects, Google Forms (no network needed)

> **Tip:** If auto-extraction fails (common with CORS-blocked sites), you can still save the URL and fill in details manually from your dashboard.

### Opportunity Finder
- Curated feed of verified, real opportunities with working URLs
- Filter by type (hackathon, grant, accelerator, job, government, platform)
- Sort by deadline (soonest), recently added, or prize amount
- **Submit a Tip** — paste any URL to extract and add it to your personal tracker
- One-click "Save to Tracker" copies any curated opportunity to your dashboard

### AI Assistant
Generate application materials with contextual awareness:
- 12 type-aware templates: hackathon pitch, accelerator pitch, grant impact essay, grant budget, job cover letter, LinkedIn message, government statement of purpose, platform integration proposal, cold email, custom prompt
- Tone selection: professional, enthusiastic, technical, casual
- **Backend mode** (recommended): GPT-4o-mini via your own OpenAI API key for high-quality, contextual drafts
- **Offline mode**: Local template-based generation when no backend is connected

### Calendar & Deadlines
- Month, week, and list views
- Color-coded by deadline urgency
- Export any deadline as `.ics` for Google Calendar, Outlook, Apple Calendar
- Days-until countdown on every opportunity card

### Data Portability & Privacy
- **100% client-side storage** — all data lives in your browser's localStorage
- No accounts, no tracking, no telemetry
- **Export/Import JSON** — backup your data or sync across devices
- Service worker for offline cache

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v3, shadcn/ui |
| State | Zustand (persisted to localStorage) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Backend | Python 3.11, FastAPI, Uvicorn |
| Scraping | requests, BeautifulSoup4, lxml |
| AI | OpenAI SDK (GPT-4o-mini) |
| Deployment | Docker Compose, Caddy reverse proxy |

## Quick Start

### Frontend (PWA)

```bash
cd app
npm install
npm run dev      # Development server at http://localhost:3000
npm run build    # Production build → dist/
```

The dev server proxies `/api/*`, `/scrape`, `/scrape-batch`, and `/health` to `localhost:8000` automatically.

### Python Backend (Optional but Recommended)

```bash
cd scraper
pip install -r requirements.txt

# Copy the example env and add your keys
cp .env.example .env
# Edit .env to add OPENAI_API_KEY and any optional API tokens

# Run the FastAPI server
uvicorn scraper.api:app --reload --port 8000
```

**Backend endpoints:**
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/scrape` | POST | Scrape a single URL |
| `/scrape-batch` | POST | Scrape multiple URLs |
| `/api/ai/status` | GET | Check if OpenAI is configured |
| `/api/ai/generate` | POST | Generate AI draft |

### Connecting Frontend to Backend

1. Open Optimi in your browser
2. Go to **Settings** (gear icon)
3. Enter your backend URL (e.g., `https://auridux.com` or `http://localhost:8000`)
4. Toggle **AI Assistant** on
5. Click **Test Connection** to verify

## Project Structure

```
.
├── app/                    # React PWA
│   ├── src/
│   │   ├── components/     # UI components (shadcn + custom)
│   │   ├── pages/          # Route-level pages
│   │   │   ├── Dashboard.tsx         # Kanban pipeline
│   │   │   ├── SmartExtract.tsx      # URL extraction with live logs
│   │   │   ├── OpportunityFinder.tsx # Curated feed + Submit Tip
│   │   │   ├── AIAssistant.tsx       # AI draft generator
│   │   │   └── CalendarPage.tsx      # Deadline calendar + .ics export
│   │   ├── store/          # Zustand state management
│   │   ├── lib/parsers/    # Frontend URL parsers
│   │   │   ├── generic.ts       # CORS proxy fetch + DOMParser
│   │   │   ├── knownUrls.ts     # Hard-coded verified URLs
│   │   │   ├── devpost.ts       # Devpost hackathon slug extractor
│   │   │   ├── twitter.ts       # Twitter syndication + oEmbed
│   │   │   ├── reddit.ts        # Reddit JSON API
│   │   │   ├── hackernews.ts    # HN Algolia API
│   │   │   ├── github.ts        # GitHub REST API
│   │   │   ├── linkedin.ts      # LinkedIn redirect decoder
│   │   │   └── googleForms.ts   # Google Forms detector
│   │   └── data/           # Seed opportunity data
│   ├── public/             # PWA icons & manifest
│   └── index.html
├── scraper/                # Python scraping engine
│   ├── scraper/
│   │   ├── api.py          # FastAPI app
│   │   ├── engine.py       # Extraction orchestrator
│   │   ├── ai.py           # OpenAI integration
│   │   ├── extractors/     # Platform-specific extractors
│   │   │   ├── known_urls.py    # Hard-coded verified URLs
│   │   │   ├── hackernews.py    # HN Algolia API (free)
│   │   │   ├── github.py        # GitHub REST API (free)
│   │   │   ├── reddit.py        # Reddit JSON API
│   │   │   ├── indiehackers.py  # Indie Hackers HTML parser
│   │   │   ├── devpost.py       # Devpost hackathon extractor
│   │   │   ├── twitter.py       # Twitter oEmbed + syndication
│   │   │   ├── twitter_api.py   # Twitter API v2 (optional)
│   │   │   ├── producthunt.py   # Product Hunt API (optional)
│   │   │   ├── linkedin.py      # Redirect resolver
│   │   │   ├── google_forms.py  # Forms detector
│   │   │   └── generic.py       # BeautifulSoup4 generic scraper
│   │   ├── models.py       # ScrapedOpportunity dataclass
│   │   └── utils.py        # HTTP helpers, deadline detection, type classification
│   ├── requirements.txt
│   ├── .env.example        # Environment variable template
│   └── Dockerfile
├── docker-compose.yml      # Full-stack deployment
├── Caddyfile               # Reverse proxy + HTTPS
└── DEPLOY.md               # Step-by-step VPS deployment guide
```

## Extraction Strategy

The frontend and backend share the same extraction priority:

1. **Known URLs** — Instant lookup, no network request. Covers USAII Hackathon, a16z Speedrun, Google Cloud Startup, Ghana Passport.
2. **Platform APIs** — Free public APIs that require no authentication:
   - **Hacker News** — Algolia Search API (`hn.algolia.com/api/v1/search`)
   - **GitHub** — REST API (`api.github.com/repos/.../issues/...`)
3. **Backend scraper** (if configured) — Server-side `requests` + BeautifulSoup4 with retry logic. Bypasses CORS entirely.
4. **Client-side APIs** — Browser-based public APIs:
   - **Reddit** — `.json` endpoint (works in browser, blocked from backend)
   - **Twitter** — oEmbed + syndication API
5. **URL-pattern parsers** — Devpost, LinkedIn, Google Forms: no network needed.
6. **Generic client-side** — CORS proxies + DOMParser fallback.

### Optional API Keys (for better social media extraction)

| Platform | API | Cost | How to Get Key | Backend Env Var |
|----------|-----|------|----------------|-----------------|
| **Twitter/X** | API v2 | Free: 500 tweets/mo; Basic: $100/mo | [developer.twitter.com](https://developer.twitter.com/en/portal/dashboard) | `TWITTER_BEARER_TOKEN` |
| **Product Hunt** | GraphQL v2 | Free tier available | [producthunt.com/v2/oauth/applications](https://www.producthunt.com/v2/oauth/applications) | `PRODUCT_HUNT_TOKEN` |
| **OpenAI** | GPT-4o-mini | Pay-as-you-go | [platform.openai.com](https://platform.openai.com) | `OPENAI_API_KEY` |

> **Hacker News** and **GitHub** require no keys and work out of the box.

### Why Some Sites Still Fail

Even with APIs, some platforms are restrictive:

| Platform | Status | Reason |
|----------|--------|--------|
| **LinkedIn** | ❌ No API for posts | LinkedIn has no public API for personal posts. Only redirect resolution works. |
| **Reddit** | ⚠️ Browser only | Reddit blocks backend requests with bot detection. Browser `.json` API works. |
| **Twitter/X** | ⚠️ Limited free tier | Elon killed most free access. oEmbed still works for some tweets. API v2 is paid. |
| **Indie Hackers** | ⚠️ Backend only | CORS blocks frontend. Backend BeautifulSoup works. |

## Backend Configuration

### Environment Variables

Create `scraper/.env`:

```env
# Required for AI Assistant
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Twitter API v2 (for reliable tweet extraction)
# TWITTER_BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAA...

# Optional: Product Hunt API (for product launches)
# PRODUCT_HUNT_TOKEN=your-token-here
```

No other variables are required.

### Docker Deployment

```bash
# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

The backend runs on port 8000 internally. Caddy proxies `/api/*`, `/scrape`, `/scrape-batch`, and `/health` to it.

### Adding New Extractors

1. Create a class in `scraper/scraper/extractors/your_platform.py` inheriting from `BaseExtractor`
2. Implement `name`, `can_handle(url)`, and `extract(url)`
3. Register it in `scraper/scraper/engine.py` `DEFAULT_EXTRACTORS`

The engine automatically tries extractors in order and falls back to the generic extractor.

## Deployment

### Static Hosting (Frontend Only)

The frontend is a static SPA that can be deployed anywhere:

- **Vercel / Netlify / Cloudflare Pages**: Connect your repo and set build command to `npm run build` with output directory `dist`
- **GitHub Pages**: Build locally and push `dist/` to `gh-pages` branch
- **Self-hosted**: Serve the `dist/` folder with any static file server

Because the app uses `HashRouter`, deep links work correctly on static hosts without server-side routing configuration.

### Full Stack on a VPS (Recommended)

For the complete experience (frontend + AI backend + scraping API), deploy to a VPS using **Caddy** as the reverse proxy:

- **Automatic HTTPS** — Caddy handles Let's Encrypt certificates with zero config
- **Single command deploy** — `docker-compose up -d` starts the backend; Caddy serves static files from `app/dist/`
- See [`DEPLOY.md`](DEPLOY.md) for the complete step-by-step guide

```
┌─────────┐     ┌─────────────────────────────┐     ┌──────────┐
│  User   │────▶│  Caddy (auto HTTPS)         │────▶│  Static  │
│         │     │  - Serves app/dist/         │     │  Files   │
│         │     │  - Proxies /api/* → backend │     │          │
└─────────┘     └─────────────────────────────┘     └──────────┘
                              │
                              ▼
                        ┌──────────┐
                        │ FastAPI  │
                        │ Backend  │
                        │ (Docker) │
                        └──────────┘
```

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| "Limited auto-extraction" warning | Public CORS proxy blocked the site | Self-host the backend, or save the URL and fill details manually |
| "Couldn't extract from this URL" | No title or description found in HTML | The page may require JavaScript. Save the URL and add details manually. |
| Submit Tip saves "Untitled Opportunity" | CORS proxy failed, URL-based inference returned no title | Normal for blocked sites. Edit the card in your dashboard. |
| Data lost after browser restart | localStorage cleared (incognito, privacy mode, manual clear) | Export JSON regularly as backup |
| AI Assistant shows offline templates | Backend not connected or OpenAI key missing | Go to Settings, enter backend URL, toggle AI on, test connection |
| Backend test fails | Old Docker container blocking port 8000 | Run `docker stop optimi-backend` and restart uvicorn |
| Twitter extraction fails | Tweet is private or X API is rate-limiting | oEmbed only works for public tweets. Add `TWITTER_BEARER_TOKEN` for better reliability. |
| Reddit extraction fails | Reddit blocked the request | Reddit blocks backend scrapers. The frontend `.json` parser works in browsers. |

## Data Privacy

- All opportunity data is stored **locally in your browser** via localStorage
- No backend database, no user accounts, no telemetry
- Your OpenAI API key lives only in the backend `.env` file — never exposed to the browser
- Optional API keys (Twitter, Product Hunt) also live in the backend `.env` only
- Export JSON contains your entire dataset for backup or migration

## Known Limitations

- **Google Calendar Sync**: Simulated in Settings. Use `.ics` export from the Calendar page for real calendar integration.
- **CORS Proxies**: Client-side generic extraction relies on public CORS proxies. For reliable scraping, self-host the FastAPI backend.
- **LinkedIn Content**: LinkedIn blocks all unauthenticated scraping. We can only resolve redirect URLs, not extract post content.
- **Twitter Free Tier**: Twitter/X API v2 free tier is limited to 500 tweets/month. oEmbed works for some public tweets but is flaky.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © [Optimi Contributors](LICENSE)

---

Built with care for builders and dreamers.
