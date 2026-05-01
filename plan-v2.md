# Plan — Optimi PWA Rebuild v2.0

## Overview
Complete rebuild of the Opportunity Tracker into a light-themed, productivity-focused Progressive Web App. Mobile-first, sharp typography, Google OAuth integration, specialized URL parsers, opportunity discovery, and AI application assistance.

## What's New vs v1.0
- Light theme (warm gray/off-white) replacing dark slate
- PWA: manifest.json, service worker, offline support, installable
- Google OAuth + Calendar API integration (client-side)
- Specialized frontend parsers: LinkedIn, X/Twitter, Devpost, Eventbrite, Generic
- Mobile-first responsive design (no more appalling mobile view)
- Sharp modern font (Geist + JetBrains Mono for data)
- Opportunity Finder: curated feed with search/filter
- AI Application Assistant: structured help to craft applications
- Browser notification reminders via service worker
- .ics export for calendar import
- Clean productivity aesthetic with ample whitespace

## Architecture
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui
- **PWA**: vite-plugin-pwa for manifest, service worker, offline support
- **Auth**: Google Identity Services (OAuth 2.0 client-side)
- **Calendar**: Google Calendar API (client-side with OAuth token)
- **Storage**: localStorage (opportunities, settings), IndexedDB (offline cache)
- **Notifications**: Web Push API via service worker
- **Font**: Geist (Sans) + JetBrains Mono (Monospace/data)

## Stage 1: Design (Pro_Designer)
- Complete visual redesign: light theme, productivity aesthetic
- Mobile-first layouts for all pages
- PWA manifest design, app icons, splash screens
- Google Auth flow design
- Calendar integration UI design

## Stage 2: Scaffold (Main Agent + Scaffold subagent)
- Re-init project with PWA support
- Configure Google Fonts (Geist + JetBrains Mono)
- PWA manifest, service worker config
- Tailwind theme: light colors, sharp shadows
- Global layout with mobile bottom nav + desktop sidebar
- Shared components: sharp buttons, clean cards, mobile nav
- Google OAuth setup

## Stage 3: Parallel Page Implementation
- **Group A**: Dashboard (Kanban) + Opportunity Detail — fully mobile responsive
- **Group B**: Smart Extract (specialized parsers) + Opportunity Finder
- **Group C**: Calendar + AI Assistant + Settings (Google Auth, PWA)

## Stage 4: Integration & Deploy
- Merge all branches
- Build with PWA assets
- Deploy

## Deliverables
1. Deployed PWA URL
2. Python scraper remains at `/mnt/agents/output/scraper/` (unchanged)
