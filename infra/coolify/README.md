###############################################################################
# Webiface Revenue OS — Coolify Deployment Guide
# DukanOS — Coolify Production Deployment Guide
###############################################################################

This directory contains the Dockerfiles, nginx configs, and PHP runtime config
used to deploy the Webiface Revenue OS (the cold-calling CRM defined in
`AGENTS.md`) via [Coolify](https://coolify.io).
This directory contains the Dockerfiles, Nginx configurations, and PHP-FPM runtime settings configured for deploying **DukanOS** (Appliance & Electrical Store Operating System) via [Coolify](https://coolify.io).

The stack matches the project's actual services:
---

- **nginx** — gateway: serves the React SPA and reverse-proxies `/api`,
  `/sanctum`, and `/storage` to the backend via FastCGI. This is the only
  service exposed through Coolify's Traefik proxy.
- **backend** — Laravel 13 API on PHP 8.3-FPM.
- **queue** — Laravel queue worker (`queue:work redis`).
- **scheduler** — Laravel task scheduler loop.
- **postgres** — PostgreSQL 18 (primary relational database).
- **redis** — Redis 7 (cache, sessions, queue broker).
- **minio** — MinIO (S3-compatible object storage for recordings/screenshots).
## Service Architecture

There is **no** Twilio/VoIP dialer and **no** WebSocket/realtime service yet
(calls are placed manually via Google Voice, per `AGENTS.md`). The compose file
is structured so those can be added later without disturbing the gateway.
```
[ Internet / Clients ]
          │
          ▼ (HTTPS / 443)
[ Coolify Traefik Proxy (SSL Termination) ]
          │
          ▼ (HTTP / Port 80 - Internal)
     ┌─────────┐
     │  nginx  │ ── serves React 19 SPA static assets (`dist/`)
     └────┬────┘
          │ (FastCGI: `/api/*`, `/sanctum/*`)
          ▼
   ┌──────────────┐      ┌─────────────┐
   │   backend    │ ───► │  postgres   │ (PostgreSQL 17 Database)
   │ (PHP 8.4-FPM)│      └─────────────┘
   └──────┬───────┘      ┌─────────────┐
          │ ───────────► │    redis    │ (Cache, Sessions & Queue Broker)
          ▼              └─────────────┘
   ┌──────────────┐             ▲
   │    queue     │ ────────────┘
   │ (Worker)     │
   └──────────────┘
   ┌──────────────┐
   │  scheduler   │
   │ (Cron Loop)  │
   └──────────────┘
```

## Repository layout
1. **`nginx`** (Gateway): Single ingress service exposed to Coolify's Traefik proxy. Serves the pre-compiled React 19 SPA and forwards API/Auth requests to `backend:9000` via FastCGI.
2. **`backend`** (Laravel 13 API): PHP 8.4-FPM container with PostgreSQL, Redis, OPcache, and PHP extensions.
3. **`queue`** (Queue Worker): Runs background jobs (asynchronous invoice generation, email notifications, audit logs).
4. **`scheduler`** (Task Scheduler): Runs Laravel periodic scheduled tasks (`schedule:work`).
5. **`postgres`** (Database): PostgreSQL 17 Alpine with persistent storage volume (`dukanos_db_data`).
6. **`redis`** (Cache & Broker): Redis 7 Alpine with persistent storage volume (`dukanos_redis_data`).

---

## Directory Layout

```
docker-compose.yml            ← compose manifest at repo root (build context = repo root)
docker-compose.yml              ← Main compose manifest at repository root
.dockerignore                   ← Excludes node_modules, logs, and artifacts
coolify/
├── .env.example             ← env vars to paste into Coolify UI
├── README.md                ← this file
├── .env.example                ← Environment template for Coolify UI
├── README.md                   ← This deployment guide
└── docker/
    ├── nginx/
    │   ├── Dockerfile        ← builds the React SPA + nginx gateway
    │   ├── nginx.conf        ← master nginx config (Traefik-aware)
    │   └── default.conf      ← server block (API + SPA routing)
    │   ├── Dockerfile          ← Multi-stage Node 22 + Nginx 1.27 gateway build
    │   ├── nginx.conf          ← Master Traefik-aware Nginx configuration
    │   └── default.conf        ← Server block routing for SPA, API, and storage
    └── php/
        ├── Dockerfile        ← Laravel/PHP-FPM image
        ├── php.ini           ← PHP runtime overrides
        └── entrypoint.sh     ← migrate / keygen / cache / storage:link
        ├── Dockerfile          ← PHP 8.4-FPM + Composer + PostgreSQL + Redis image
        ├── php.ini             ← Production PHP & OPcache configuration
        └── entrypoint.sh       ← Migration, keygen, storage:link, and cache warmer
```

## Deploy in Coolify
---

1. In Coolify, create a new **Docker Compose** resource.
2. Connect your Git repository (the repo root).
3. Set the compose path to `docker-compose.yml`.
4. Open **Environment Variables** and paste the contents of
   `coolify/.env.example`, then change every `change_me_*` value.
5. Go to the **Domains** tab and assign your domain (e.g. `crm.webiface.com`)
   to the **nginx** service. Coolify's Traefik will issue a Let's Encrypt cert
   and route traffic to nginx:80.
6. Deploy.
## Step-by-Step Deployment in Coolify

Coolify differences handled by this stack (do **not** add `ports:` or
`container_name:`):
### Step 1: Create a Docker Compose Application
1. In your Coolify dashboard, select your **Project** and **Environment**.
2. Click **+ New Resource** and select **Docker Compose**.
3. Connect your Git repository (GitHub / GitLab or custom Git URL).
4. Set the **Compose Path** to `docker-compose.yml` (default at repo root).

- No exposed ports — Traefik is the only ingress.
- No `container_name` — Coolify names containers with UUID suffixes.
- Only `nginx` has `traefik.enable=true`; every other service is internal.
- Inline `configs:` (no `file:` references) to avoid Coolify path issues.
- Volumes use the `local` driver (Coolify manages lifecycle).
### Step 2: Configure Environment Variables
1. In Coolify, open the **Environment Variables** tab for the application.
2. Copy all variables from [`coolify/.env.example`](./.env.example) and paste them into the input box.
3. Update the following values:
   - `APP_URL`: Set to your live production domain (e.g. `https://app.yourdomain.com`).
   - `FRONTEND_URL`: Same as `APP_URL`.
   - `SANCTUM_STATEFUL_DOMAINS`: Bare hostname without scheme (e.g. `app.yourdomain.com`).
   - `DB_PASSWORD`: Set a secure database password.
   - `REDIS_PASSWORD`: Set a secure Redis password.
   - `RUN_SEED`: Set to `true` on first deploy if you want initial seeded demo accounts and electrical inventory catalog. Set to `false` for clean production.

## How the gateway works
### Step 3: Configure Domain & Traefik
1. Navigate to the **Domains** tab or service settings in Coolify.
2. Set the public domain on the **`nginx`** service (e.g. `https://app.yourdomain.com`).
3. Ensure the internal port is set to `80`.
4. Coolify's Traefik will automatically provision and renew a Let's Encrypt SSL/TLS certificate.

- The React app is built at image build time with `VITE_API_URL=''`, so all
  API calls are **same-origin**. nginx proxies `/api` → `backend:9000` via
  FastCGI, and `/sanctum` for the CSRF cookie. No CORS configuration needed.
- `$proxy_x_forwarded_proto` is used (not `$scheme`) so the backend sees the
  real HTTPS scheme through Traefik. `TRUSTED_PROXIES=*` makes Laravel trust
  the forwarded headers.
- `SANCTUM_STATEFUL_DOMAINS` must contain the bare hostname you assign to
  nginx (Coolify UI) so the SPA session auth works.
### Step 4: Deploy
1. Click **Deploy**.
2. Coolify will build the multi-stage images, initialize PostgreSQL & Redis, execute migrations, warm caches, and start the gateway.
3. Access your domain in the browser.

## First run
---

- The backend entrypoint waits for PostgreSQL, auto-generates `APP_KEY` if
  unset, runs `migrate --force`, creates the `storage:link`, and warms caches.
- Set `RUN_SEED=true` (in Coolify env) only if you want demo/dev data.
- Uploaded files live in the shared `app_storage` volume, served by nginx at
  `/storage`. MinIO is available for S3-disk attachments (set `FILESYSTEM_DISK=s3`).
## Local Docker Compose Validation

## Local validation
To validate the configuration syntax and variable interpolation on your local system:

If Docker is available locally you can sanity-check the compose file from the
repo root:

```bash
docker compose -f docker-compose.yml config
```

(This validates syntax and variable interpolation; it does not build images.)
