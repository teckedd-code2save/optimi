# Optimi — Opportunity Tracker

[![Build](https://img.shields.io/badge/build-passing-success)](https://github.com/yourusername/opportunity-hook)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Optimi** is a lightweight, privacy-first Progressive Web App (PWA) for tracking opportunities — hackathons, grants, accelerators, jobs, and more. It includes a curated opportunity finder, an AI application-assistant, a visual pipeline dashboard, and a Python scraping engine for extracting structured data from URLs.

![Optimi Screenshot](app/public/apple-touch-icon.png)

## Features

- **Kanban Pipeline** — Track opportunities from *Saved* → *Researching* → *Preparing* → *Applied* → *Interview* → *Accepted*
- **Smart Extract** — Paste any URL and extract title, organization, deadline, description, and prizes. Uses your self-hosted backend for full scraping power, or falls back to client-side CORS proxies.
- **Opportunity Finder** — Browse a curated feed of hackathons, grants, accelerators, and jobs
- **AI Assistant** — Generate cover letters, project proposals, grant essays, and cold emails. Uses OpenAI via your backend when configured, or local templates offline.
- **Calendar & .ics Export** — View deadlines in month/week/list views and export to any calendar app
- **PWA Support** — Install to your home screen, works offline, with localStorage persistence
- **Data Portability** — Export/import your entire dataset as JSON

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v3, shadcn/ui |
| State | Zustand (persisted to localStorage) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Scraper | Python 3, requests, BeautifulSoup4 |

## Quick Start

### Frontend (PWA)

```bash
cd app
npm install
npm run dev      # Development server at http://localhost:3000
npm run build    # Production build → dist/
```

### Python Scraper

```bash
cd scraper
pip install -r requirements.txt

# Scrape a single URL
python -m scraper.cli scrape "https://example.com/hackathon"

# Scrape multiple URLs from a file
python -m scraper.cli scrape-file urls.txt --output results.json

# Interactive mode
python -m scraper.cli interactive

# Run the FastAPI server (from the scraper/ directory)
uvicorn api:app --reload --port 8000

# Or from the project root
uvicorn scraper.api:app --reload --port 8000

# Or use the convenience script from the project root
./scraper/run.sh
```

## Project Structure

```
.
├── app/                    # React PWA
│   ├── src/
│   │   ├── components/     # UI components (shadcn + custom)
│   │   ├── pages/          # Route-level pages
│   │   ├── store/          # Zustand state management
│   │   ├── lib/parsers/    # Frontend URL parsers
│   │   └── data/           # Seed opportunity data
│   ├── public/             # PWA icons & manifest
│   └── index.html
├── scraper/                # Python scraping engine
│   ├── scraper/
│   │   ├── engine.py       # Main orchestrator
│   │   ├── extractors/     # Platform-specific extractors
│   │   └── models.py       # Standardized data schema
│   └── requirements.txt
├── plan.md                 # v1.0 architecture plan
├── plan-v2.md              # v2.0 PWA rebuild plan
└── info.md                 # Research findings (sample data)
```

## How the Frontend and Scraper Interact

The React app and Python scraper are **loosely coupled**:

- **Frontend (browser)** — Can extract generic websites via public CORS proxies using client-side `fetch`. For Twitter/X, LinkedIn, and Google Forms, it uses URL-pattern heuristics (no server needed).
- **Python Scraper (CLI/server)** — The same extraction engine wrapped as a FastAPI server (`scraper/api.py`) for heavier scraping or batch jobs. Deploy it separately and point the frontend at it if you need full server-side extraction.

| Platform | Frontend (client-side) | Python Scraper |
|----------|----------------------|----------------|
| Generic websites | ✅ Fetched via CORS proxy, parsed with DOMParser | ✅ BeautifulSoup4 |
| LinkedIn redirects | ✅ URL decode | ✅ Redirect resolver |
| X / Twitter | ✅ URL pattern only | ✅ Twitter oEmbed API (no auth) |
| Google Forms | ✅ Metadata detection | ✅ Form detector |
| Devpost | ✅ Pattern matching | — |

> **Note:** When a backend URL is configured in Settings, Smart Extract sends URLs to your server for full scraping power. Without a backend, it uses client-side extraction.

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

## Data Privacy

All opportunity data is stored **locally in your browser** via localStorage. There is no backend database, no user accounts, and no telemetry. The optional Google Calendar integration is simulated in the current version — see [Known Limitations](#known-limitations).

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Known Limitations

- **Google Calendar Sync**: Coming soon. For now, export deadlines as `.ics` from the Calendar page and import into any calendar app.
- **CORS Proxies**: Client-side generic extraction relies on public CORS proxies. They work for most sites but can be rate-limited or blocked. For reliable scraping, self-host the FastAPI backend.
- **AI Assistant**: Uses local templates by default. Connect your own OpenAI API key to the backend for LLM-powered generation.

## License

MIT © [Optimi Contributors](LICENSE)

---

Built with care for builders and dreamers.
