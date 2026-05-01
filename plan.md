# Plan — Opportunity Tracker Dashboard + Scraping Engine

## Overview
Build a full-stack application tracking dashboard with an intelligent scraping engine. The dashboard helps the user track applications/programs/hackathons with deadlines, preparation checklists, and auto-extracted opportunity details from URLs.

## Architecture
- **Frontend**: React SPA (Vite + Tailwind + shadcn/ui) with HashRouter, localStorage persistence
- **Scraping Engine**: Python-based engine using requests + BeautifulSoup for structured extraction
- **Data Model**: Standardized opportunity schema (title, org, deadline, type, description, requirements, URL, status, checklist, notes)

## URLs to Research
1. https://x.com/NousResearch/status/2045225469088326039 (NousResearch opportunity)
2. https://usaii-global-ai-hackathon-2026.devpost.com/ (USAII Global Hackathon 2026)
3. https://x.com/XiaomiMiMo/status/2048822064417755505 (Xiaomi MiMo opportunity)
4. https://speedrun.a16z.com/apply (a16z speedrun accelerator)
5. "Ghana gov pass" — note, no URL
6. https://100t.xiaomimimo.com/ (Xiaomi MiMo Orbit 100T Credits)
7. LinkedIn redirect URL — decode and follow

## Stage 1: Research (Orchestrator)
- Visit each URL to extract real opportunity data
- Search for "Ghana gov pass" to understand what program this is
- Decode LinkedIn redirect URL
- Write findings to `/mnt/agents/output/info.md`

## Stage 2: Design (Pro_Designer)
- Load webapp swarm design guide
- Design the dashboard (pages: Dashboard/Tracker, Opportunity Detail, Add/Edit Opportunity, Scraping Interface, Preparation Checklist)
- Output to `/mnt/agents/output/design/`

## Stage 3: Scaffold (Scaffold Subagent)
- Init project using webapp-building-swarm
- Implement home/landing page with design
- Set up HashRouter, shared components (Navbar, Footer, Layout)
- Configure Tailwind theme, global CSS, Google Fonts
- Install additional packages (lucide-react, framer-motion, date-fns)

## Stage 4: Parallel Page Implementation
- **Group A**: Dashboard/Tracker page — opportunity cards, filters, status pipeline (Saved → Researching → Applied → Interview → Result)
- **Group B**: Opportunity Detail + Add/Edit forms — full CRUD, deadline countdown, checklist management, notes
- **Group C**: Scraping Interface + Preparation Hub — URL input form, mock extraction display, prep materials view

## Stage 5: Scraping Engine (Python Subagent — runs parallel to webapp pages)
- Build Python scraping engine in `/mnt/agents/output/scraper/`
- Standardized extraction schema
- Support for Twitter/X (via embed/nitter fallback), regular sites via requests+bs4
- CLI interface and JSON output

## Stage 6: Merge, Integration, Deploy
- Merge all branches into main
- Build and deploy the React app
- Package the Python scraper as a runnable tool
- Final test of the full system

## Skills Used
- Stage 1-4, 6: `vibecoding-webapp-swarm` + `webapp-building-swarm`
- Stage 5: `vibecoding-general-swarm` (Python scraping engine)

## Deliverables
1. Deployed React dashboard URL
2. Python scraping engine in `/mnt/agents/output/scraper/`
3. Pre-populated dashboard with all 7 opportunities from user's messages
