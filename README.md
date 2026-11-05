# ThinkCode Full-Stack Template

[![Laravel 13](https://img.shields.io/badge/Laravel-13.x-red.svg)](https://laravel.com)
[![React 19](https://img.shields.io/badge/React-19.x-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue.svg)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-blue.svg)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-red.svg)](https://redis.io)
[![Coolify Ready](https://img.shields.io/badge/Coolify-Ready-purple.svg)](https://coolify.io)

A robust, production-oriented full-stack starter template developed for ThinkCode IT Solutions. Built to be cloned across SaaS products and client web applications, eliminating repetitive DevOps, authentication, and architectural configuration.

---

## 1. System Overview & Technology Stack

| Layer | Technology | Key Capabilities |
| :--- | :--- | :--- |
| **Backend API** | **Laravel 13** on **PHP 8.4-FPM** | Native Sanctum SPA session authentication, Form Requests, API Resources, native Gates/Policies, Monolog request correlation ID tracking. |
| **Frontend SPA** | **React 19** + **TypeScript** (Strict) | Vite 8, TanStack Query 5, React Router 7, Tailwind CSS, React Hook Form + Zod, accessible UI primitives, error boundary. |
| **Gateway** | **Nginx 1.27** | Traefik-aware reverse proxy forwarding `/api/*` and `/sanctum/*` via FastCGI to PHP-FPM, static asset serving, client-side SPA fallback. |
| **Database** | **PostgreSQL 17** (Alpine) | Persistent volume storage, health checks, environment-based credentials. |
| **Cache & Queue** | **Redis 7** (Alpine) | Session broker, query cache, AOF queue broker with background worker process and scheduler loop. |
| **DevOps** | **Docker Compose** + **Coolify** | Dual compose topology: production base (`infra/docker-compose.yml`) + developer override (`infra/docker-compose.dev.yml`). |

---

## 2. Quick Start Guide

### Prerequisites
- Docker Engine 24+ & Docker Compose v2.20+
- (Optional for host-level development) PHP 8.3+, Composer 2.7+, Node.js 22+, npm 10+

### Setup and Launch in 3 Commands

```bash
# 1. Clone repository
git clone <repo-url> my-project
cd my-project

# 2. Run automated setup (generates .env, installs dependencies, generates key)
make setup

# 3. Start the entire Docker stack (development mode with exposed ports)
make up
```

Once running, access the services:
- **Application Frontend:** [http://localhost:8080](http://localhost:8080)
- **API Health Check:** [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
- **Nginx Ingress Health:** [http://localhost:8080/nginx-health](http://localhost:8080/nginx-health)
- **PostgreSQL Database:** `localhost:5433` (User: `thinkcode_user`, Password: `thinkcode_db_secret`, DB: `thinkcode`)
- **Redis Broker:** `localhost:6379` (Password: `thinkcode_redis_secret`)

### Default Developer Account
- **Email:** `admin@thinkcode.dev`
- **Password:** `password`
*(Or use the "Fill Demo Credentials" button on the login screen).*

---

## 3. Developer Workflow Options

### Option A: Complete Dockerized Stack (`make up`)
Runs all 6 services (`nginx`, `backend`, `queue`, `scheduler`, `postgres`, `redis`) in Docker containers. Ideal for onboarding and testing the exact production topology.

```bash
make up         # Start containers in background
make logs       # Follow logs from all containers
make ps         # Check health status
make down       # Stop and remove containers
```

### Option B: Hybrid Host Iteration (Instant HMR)
Run PostgreSQL and Redis in Docker containers, while running Vite and Laravel on your host machine for sub-second hot reload:

```bash
# 1. Start database and Redis containers only
make up-deps

# 2. Start Laravel API dev server on host (terminal 1)
make dev-backend

# 3. Start Vite frontend dev server on host with HMR (terminal 2)
make dev-frontend
```
The Vite development server is reachable at [http://localhost:5173](http://localhost:5173) and automatically proxies `/api` and `/sanctum` requests to `http://localhost:8000`.

---

## 4. Makefile Commands Reference

| Command | Action |
| :--- | :--- |
| `make setup` | Initialize environment files (`.env`), install composer & npm dependencies, generate application key. |
| `make up` | Build and start all 6 Docker containers with local dev port mappings. |
| `make up-deps` | Start only PostgreSQL and Redis containers. |
| `make down` | Stop and teardown all containers and local networks. |
| `make restart` | Rebuild and restart the container stack. |
| `make logs` | Tail logs across all running Docker services. |
| `make ps` | List containers and healthcheck statuses. |
| `make migrate` | Execute database migrations inside the backend container. |
| `make seed` | Seed database with baseline data inside the backend container. |
| `make test` | Execute both backend (PHPUnit) and frontend (Vitest) test suites. |
| `make test-backend` | Run backend PHPUnit feature and unit tests. |
| `make test-frontend` | Run frontend Vitest tests. |
| `make build` | Compile frontend production bundle and build Docker images. |
| `make clean` | Purge framework caches, build artifacts, and test logs. |

---

## 5. API Conventions & Authentication Flow

All endpoints are versioned under `/api/v1`:

```
GET    /sanctum/csrf-cookie     Initialize CSRF protection for SPA session
POST   /api/v1/auth/login       Login via session cookie (Rate-limited: 5 req/min)
POST   /api/v1/auth/register    Register a new user account (Toggleable via ALLOW_REGISTRATION)
GET    /api/v1/auth/me          Retrieve currently authenticated user profile
POST   /api/v1/auth/logout      Revoke session cookie or personal access token
POST   /api/v1/tokens           Issue dedicated personal access token (Rate-limited, 7-day expiry)
GET    /api/v1/tokens           List active personal access tokens for authenticated user
DELETE /api/v1/tokens/current   Revoke token used for current request
DELETE /api/v1/tokens/{id}      Revoke specific personal access token by ID
GET    /api/v1/health/live      Lightweight process liveness check ({"status":"ok"})
GET    /api/v1/health/ready     Deep readiness probe (DB, Redis, sanitized for production)
GET    /api/v1/health           Readiness check alias
GET    /api/v1/tasks            Protected resource demonstration
POST   /api/v1/queue-test       Dispatch test background job to Redis queue
GET    /api/v1/admin-check      Authorization test protected by Laravel Gate
```

### Authentication Architectures
1. **First-Party SPA Sessions (Cookie-Based):**
   - Browser client requests `/sanctum/csrf-cookie` to obtain `XSRF-TOKEN` and session cookies.
   - The API client automatically attaches `X-XSRF-TOKEN` and `credentials: 'include'` on mutating requests.
   - Upon `/api/v1/auth/login`, Laravel authenticates credentials, regenerates the session ID, and issues the authenticated session cookie.
   - Sessions and queue jobs are stored in Redis with Append-Only File (AOF) persistence.
2. **Third-Party / API Consumers (Bearer Tokens):**
   - External tools and integrations authenticate via `POST /api/v1/tokens` with explicit credentials, token name, and abilities.
   - Tokens have a default 7-day expiration (`SANCTUM_TOKEN_EXPIRATION`), are stored hashed (SHA-256), and raw secrets are never exposed after creation.
   - Expired tokens are pruned automatically by the scheduler daily.

---

## 6. Coolify Production Deployment

This template is configured for zero-downtime deployment on [Coolify](https://coolify.io):

1. **Create Resource:** In the Coolify dashboard, create a new **Docker Compose** service and connect this repository.
2. **Compose File Path:** Select `infra/docker-compose.yml`.
3. **Environment Variables:** Copy contents of `infra/coolify/.env.example` into the Coolify Environment Variables tab. Set strong passwords for `DB_PASSWORD` and `REDIS_PASSWORD`.
4. **Ingress Domain:** Assign your domain (e.g. `https://app.yourdomain.com`) to the **`nginx`** service.
5. **Port:** Ensure Coolify points internal HTTP traffic to port `80`.
6. **Deploy:** Click **Deploy**. Coolify builds the multi-stage images, initializes PostgreSQL and Redis, executes migrations, warms caches, and routes traffic via Traefik.

---

## 7. Database Backup & Restore

### Backup PostgreSQL
```bash
docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres \
  pg_dump -U thinkcode_user -F c -b -v -f /tmp/backup.dump thinkcode

docker compose --env-file .env -f infra/docker-compose.yml cp postgres:/tmp/backup.dump ./thinkcode_backup.dump
```

### Restore PostgreSQL
```bash
docker compose --env-file .env -f infra/docker-compose.yml cp ./thinkcode_backup.dump postgres:/tmp/restore.dump

docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres \
  pg_restore -U thinkcode_user -d thinkcode --clean --if-exists -v /tmp/restore.dump
```

---

## 8. Documentation

- [Product Requirements Document (PRD)](docs/PRD.md)
- [Technical Design & Architecture](docs/DESIGN.md)
- [Database Schema & Operations](docs/DB.md)
- [AI Agent & Contributor Guidelines](docs/AGENT.md)

