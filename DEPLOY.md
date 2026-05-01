# Deploying Optimi to a VPS (Caddy + Docker)

This guide deploys the full Optimi stack (React frontend + Python backend) to any VPS using **Caddy** for reverse proxy, static file serving, and **automatic HTTPS**.

## Why Caddy?

- **Automatic HTTPS** — Caddy obtains and renews Let's Encrypt certificates with zero configuration
- **Single binary** — No need to run nginx inside Docker
- **SPA-aware** — Built-in `try_files` support for React HashRouter
- **Clean architecture** — Caddy on the host handles TLS + static files + API proxying; only the backend runs in Docker

## Prerequisites

- VPS running Ubuntu 22.04/24.04 (Hetzner, DigitalOcean, Linode, etc.)
- Docker + Docker Compose installed
- A domain name with an **A record** pointing to your VPS IP
- Ports 80 and 443 open in your firewall

## 1. Install Caddy

SSH into your VPS and install Caddy:

```bash
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl

curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list

apt update && apt install -y caddy
```

## 2. Upload Project to Server

From your local machine:

```bash
cd app && npm install && npm run build && cd ..

rsync -avz --exclude=node_modules --exclude=.git --exclude=scraper/.venv \
  ./ root@yourdomain.com:/opt/optimi/
```

> **Tip:** `app/dist/` must be built locally before rsyncing — Caddy serves those static files directly from the host filesystem.

## 3. Configure Environment

On the VPS:

```bash
ssh root@yourdomain.com
cd /opt/optimi

# Create backend env file
cp scraper/.env.example scraper/.env
nano scraper/.env
# Add: OPENAI_API_KEY=sk-...
```

## 4. Configure Caddy

Edit the `Caddyfile` and replace `yourdomain.com` with your actual domain:

```bash
nano /opt/optimi/Caddyfile
```

Then symlink it so Caddy loads it on startup:

```bash
ln -sf /opt/optimi/Caddyfile /etc/caddy/Caddyfile
caddy reload --config /etc/caddy/Caddyfile
```

Or start Caddy directly:

```bash
caddy start --config /opt/optimi/Caddyfile
```

## 5. Start the Backend

```bash
cd /opt/optimi
docker-compose up -d --build
```

This starts only the **FastAPI backend** on port `8000` (internal). Caddy on the host handles:
- `https://yourdomain.com/*` → serves `app/dist/` (static SPA)
- `https://yourdomain.com/api/*` → proxies to `localhost:8000`
- `https://yourdomain.com/health` → proxies to `localhost:8000`
- `https://yourdomain.com/scrape` → proxies to `localhost:8000`

## 6. Verify

```bash
# Health check
curl https://yourdomain.com/health

# AI status
curl https://yourdomain.com/api/ai/status

# Test scraping
curl -X POST https://yourdomain.com/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

Open `https://yourdomain.com` in your browser — you should see the Optimi app with a valid TLS certificate.

## 7. Configure the Frontend

In the app, go to **Settings → Backend & AI** and enter:

- **Backend URL**: `https://yourdomain.com`
- **Enable AI Generation**: toggle on

Click **Test Connection** to verify.

## Updating

```bash
ssh root@yourdomain.com
cd /opt/optimi
git pull
cd app && npm install && npm run build && cd ..
docker-compose up -d --build
caddy reload --config /opt/optimi/Caddyfile
```

## Architecture on VPS

```
Internet
   │
   ▼
┌─────────────────────────────────────────┐
│  Caddy (host)                           │
│  ├── HTTPS (auto Let's Encrypt)         │
│  ├── Static files → /opt/optimi/app/dist│
│  └── /api/* → localhost:8000            │
└─────────────────────────────────────────┘
                   │
                   ▼
          ┌─────────────┐
          │   Backend   │
          │  (port 8000)│
          │  FastAPI    │
          │  + OpenAI   │
          │  (Docker)   │
          └─────────────┘
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Backend not reachable | `docker-compose logs backend` |
| OpenAI not working | Verify `OPENAI_API_KEY` in `scraper/.env` |
| HTTPS not working | Check DNS A record points to VPS IP; ensure ports 80/443 are open |
| Caddy config error | Run `caddy validate --config /opt/optimi/Caddyfile` |
| CORS errors | Already enabled in FastAPI; Caddy passes original `Host` header by default |

## Alternative: nginx

If you prefer nginx, keep the original `nginx.conf` and use the previous `docker-compose.yml` with the `frontend` service. Caddy is recommended for automatic HTTPS.
