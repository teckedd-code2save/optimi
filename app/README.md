# Optimi PWA

The Optimi frontend — a React-based Progressive Web App for tracking opportunities.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Architecture

- **Entry**: `src/main.tsx` → `src/App.tsx`
- **Routing**: HashRouter (`react-router`) — works on static hosts without SSR
- **State**: Zustand with `persist` middleware (localStorage key: `optimi-store-v2`)
- **Styling**: Tailwind CSS v3 + CSS custom properties for theming
- **Components**: shadcn/ui primitives + custom components in `src/components/`
- **PWA**: Manifest + service worker configured via Vite PWA plugin (planned)

## Key Directories

```
src/
├── pages/           # Route pages (Home, OpportunityDetail, SmartExtract, etc.)
├── components/      # Reusable UI components
├── components/ui/   # shadcn/ui primitives
├── store/           # Zustand stores
├── lib/parsers/     # Frontend URL parsers (LinkedIn, Twitter, Devpost, Generic)
├── data/            # Default/seed opportunity data
├── hooks/           # Custom React hooks
└── types/           # TypeScript type definitions
```

## Environment Variables

None required. The app is fully client-side and uses localStorage for persistence.

## Building for Production

```bash
npm run build
```

Static assets are emitted to `dist/`. Deploy this folder to any static host (Vercel, Netlify, GitHub Pages, etc.).

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
- Google Calendar sync shown in Settings is currently simulated and does not perform real OAuth.
