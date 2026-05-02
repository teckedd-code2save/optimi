# Optimi PWA

The Optimi frontend — a React-based Progressive Web App for tracking opportunities.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The dev server automatically proxies API calls to `localhost:8000`:
- `/api/*` → AI Assistant endpoints
- `/scrape` and `/scrape-batch` → Smart Extract backend
- `/health` → Health check

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server with proxy |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Architecture

- **Entry**: `src/main.tsx` → `src/App.tsx`
- **Routing**: HashRouter (`react-router`) — works on static hosts without SSR
- **State**: Zustand with `persist` middleware (localStorage key: `optimi-store-v2`)
- **Styling**: Tailwind CSS v3 + CSS custom properties for theming
- **Components**: shadcn/ui primitives + custom components in `src/components/`
- **PWA**: Service worker for offline cache (`public/sw.js`)

## Key Directories

```
src/
├── pages/           # Route pages
│   ├── Dashboard.tsx         # Kanban pipeline board
│   ├── SmartExtract.tsx      # URL extraction with live logs
│   ├── OpportunityFinder.tsx # Curated feed + Submit Tip modal
│   ├── AIAssistant.tsx       # AI draft generator
│   └── CalendarPage.tsx      # Deadline calendar + .ics export
├── components/      # Reusable UI components
├── components/ui/   # shadcn/ui primitives
├── store/           # Zustand stores
├── lib/parsers/     # Frontend URL parsers
│   ├── generic.ts       # CORS proxy fetch + DOMParser
│   ├── knownUrls.ts     # Hard-coded verified URLs
│   ├── devpost.ts       # Devpost slug extractor
│   ├── twitter.ts       # Twitter oEmbed
│   ├── linkedin.ts      # LinkedIn redirect decoder
│   └── googleForms.ts   # Google Forms detector
├── data/            # Default/seed opportunity data
├── hooks/           # Custom React hooks
└── types/           # TypeScript type definitions
```

## URL Parsers

The frontend parser chain (tried in order):

1. **knownUrls** — Exact hostname match for verified opportunities. No network.
2. **linkedin** — Decodes LinkedIn `/safety/go?url=` redirects. No network.
3. **twitter** — Calls Twitter oEmbed API. Light network request.
4. **devpost** — Extracts hackathon slug from URL path. No network.
5. **googleForms** — Detects Google Forms metadata. No network.
6. **generic** (fallback) — Fetches via CORS proxies, parses HTML with DOMParser.

When a backend URL is configured in Settings, Smart Extract sends URLs to the backend first and falls back to client-side parsers on failure.

## Environment Variables

None required for the frontend. The app is fully client-side and uses localStorage for persistence.

If you want to point the dev server proxy at a different backend port, edit `vite.config.ts`:

```ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:8000' },
    '/scrape': { target: 'http://localhost:8000' },
  }
}
```

## Building for Production

```bash
npm run build
```

Static assets are emitted to `dist/`. Deploy this folder to any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages, etc.).

## Deployment

### Static Hosts

Deploy `dist/` to Vercel, Netlify, Cloudflare Pages, GitHub Pages, or any static file server. HashRouter ensures all routes work without SSR configuration.

### Full Stack on a VPS

For the complete experience with the Python backend (scraping + AI), deploy the full stack using **Caddy** for reverse proxy and automatic HTTPS:

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

See the root [`DEPLOY.md`](../DEPLOY.md) for the complete guide.

## Notes

- The app uses **HashRouter** so all routes are prefixed with `/#/` (e.g., `/#/opportunity/123`). This ensures deep linking works on static file servers.
- Google Calendar sync shown in Settings is currently simulated and does not perform real OAuth. Use the `.ics` export from the Calendar page instead.
- If you see "Limited auto-extraction" warnings, it means the public CORS proxies blocked the site. The URL is still saved — you can edit details from your dashboard. For reliable extraction, self-host the Python backend.
