# ThinkCode Full-Stack Template — AI Agent & Developer Guidelines

## 1. Scope and Responsibilities

When operating on this repository:
- Act with the standards of a Principal Software Engineer, Laravel Architect, React Architect, and DevOps Engineer.
- This codebase is a reusable enterprise starter template. Avoid client-specific business logic or premature multi-tenancy unless explicitly scoped.
- Preserve existing configurations, folder structures, and linting rules.

---

## 2. Directory Layout & Rules

```
project/
├── apps/
│   ├── backend/          # Laravel 13 API (PHP 8.4-FPM)
│   └── frontend/         # React 19 SPA (Vite + TypeScript)
├── docs/                 # System documentation & specifications
├── infra/                # Docker Compose & Coolify deployment infrastructure
│   ├── coolify/          # Coolify deployment guides and Dockerfiles
│   ├── docker-compose.yml     # Production & Coolify base stack
│   └── docker-compose.dev.yml # Local development port overrides
├── Makefile              # Canonical developer commands
└── README.md             # Project overview & operator instructions
```

### Backend Guidelines (`apps/backend/`)
1. **Framework:** Laravel 13.x. Use native Laravel features (Form Requests, API Resources, Gates, Notification channels).
2. **Authentication:**
   - Prefer Sanctum cookie SPA sessions for browser requests. Always verify CSRF token and stateful domain configuration.
   - Use Personal Access Tokens (`HasApiTokens`) only when `device_name` is explicitly provided.
3. **Database:** PostgreSQL is the primary database. SQLite in-memory is permitted only in isolated PHPUnit test configurations.
4. **Queue Workers:** Redis is the queue driver. Never run blocking operations synchronously in HTTP request controllers.
5. **Exception Handling:** Always return consistent JSON for `/api/*` endpoints. Never leak database credentials or stack traces in production.

### Frontend Guidelines (`apps/frontend/`)
1. **Framework:** React 19 with strict TypeScript (`tsconfig.app.json`).
2. **Server State:** Use TanStack Query for all remote HTTP state. Do not invent custom global state stores for cached API resources.
3. **Form Handling:** Use React Hook Form with Zod schemas. Display field-level validation errors clearly.
4. **Styling:** Use Tailwind CSS with clean utility composition via `cn()` (`lib/utils.ts`).
5. **No Embedded Secrets:** Never store sensitive API secrets in `VITE_` variables; they are compiled into the client bundle and accessible in the browser.

---

## 3. Mandatory Verification Checklist

Before committing any feature or submitting work:
1. `make test-backend` passes (PHPUnit feature and unit tests).
2. `make test-frontend` passes (Vitest unit and interaction tests).
3. `cd apps/frontend && npm run lint` passes with 0 errors.
4. `cd apps/frontend && npm run build` completes cleanly.
5. `docker compose --env-file .env -f infra/docker-compose.yml config` validates syntax.
6. Never claim a command passes without executing it and verifying its exit code.

