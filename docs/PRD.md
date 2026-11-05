# ThinkCode Full-Stack Template — Product Requirements Document (PRD)

## 1. Executive Summary

The **ThinkCode Full-Stack Template** is a production-grade, reusable starter foundation for rapid web application and SaaS product development at ThinkCode IT Solutions. It eliminates boilerplate setup across projects by providing a unified, tested, and secure baseline comprising:

- **Backend:** Laravel 13 on PHP 8.4-FPM with PostgreSQL, Redis caching/queues, and Laravel Sanctum authentication.
- **Frontend:** React 19, TypeScript (strict mode), Vite, TanStack Query, React Router, Tailwind CSS, and React Hook Form with Zod validation.
- **Infrastructure:** Docker Compose multi-service architecture (Nginx gateway, PHP-FPM API, Queue worker, Scheduler, PostgreSQL 17, and Redis 7) compatible with local development and Coolify production deployments.

---

## 2. Goals & Success Criteria

1. **Zero-Friction Onboarding:** A new engineer can clone the repository, run `make setup`, start the stack with `make up` (or `make up-deps`), and immediately develop business functionality.
2. **Unified Architecture:** Standardized conventions for API routing (`/api/v1`), response serialization, error handling, session/cookie authentication, and authorization gates.
3. **Reproducibility & Isolation:** Local development mirrors production runtime environments via Docker containerization while preserving fast host-level iteration capabilities (HMR).
4. **Platform Security by Default:** Non-root runtime processes, explicit CORS origin whitelisting, HTTP-only SameSite session cookies, CSRF protection, and separation of credentials.

---

## 3. Engineering Milestones

### Milestone 1: Docker Compose and Local Development Infrastructure (Completed)
- Multi-container architecture: Nginx Gateway, PHP-FPM API, Queue Worker, Scheduler, PostgreSQL 17 Alpine, Redis 7 Alpine.
- Dual compose topology: Base production configuration (`infra/docker-compose.yml`) + developer override (`infra/docker-compose.dev.yml`) with configurable host port forwarding.
- Coolify Traefik reverse-proxy compatibility with zero hardcoded host ports in production.
- Developer workflow tooling via GNU `Makefile`.

### Milestone 2: Laravel 13 API Foundation (Completed)
- Modern Laravel 13 architecture utilizing PHP 8.4 property hooks, typed models, and native middleware configuration in `bootstrap/app.php`.
- Laravel Sanctum SPA cookie authentication flow alongside optional personal access token support.
- Centralized exception handling ensuring consistent JSON output for all API requests (401 unauthenticated, 403 unauthorized, 422 validation, 404 not found, 500 server error).
- Redis queue integration with retry backoff, failed job handling, and test dispatch verification.
- Structured Monolog logging with UUID request correlation tracking (`X-Request-ID`).
- Comprehensive automated feature tests covering health, auth, validation, authorization, and queues.

### Milestone 3: React Frontend Foundation (Completed)
- Strict TypeScript configuration with React 19 and Vite 8.
- Server-state management powered by TanStack Query with stale-time caching and optimistic invalidation.
- Client-side routing with React Router 7, featuring `ProtectedRoute` session guards, `PublicRoute` redirects, and 404 fallback.
- Centralized API client (`lib/api/client.ts`) managing Sanctum CSRF token acquisition, credential forwarding (`credentials: 'include'`), and normalized error parsing.
- Accessible UI foundation with Tailwind CSS, Lucide icons, and component primitives (Button, Input, Card, Alert, Badge, Spinner).
- Robust client error boundary capturing rendering faults with reload action.
- Vitest and React Testing Library test suite.

### Subsequent Milestones (Deferred to Future Tasks)
- Milestone 4: Granular Role-Based Access Control (RBAC) and Permission Matrices.
- Milestone 5: Structured Business Audit Logging and Activity Streams.
- Milestone 6: Multi-tenancy Architecture and Workspace Isolation.
- Milestone 7: Billing, Subscription Management, and Invoicing (Stripe/Paddle).
- Milestone 8: Full CI/CD Automation Pipeline (GitHub Actions to Coolify webhook triggers).

---

## 4. Non-Functional Requirements

- **Performance:** Sub-100ms API health checks; sub-2s Vite production build; Docker image caching with multi-stage builds.
- **Reliability:** Process health checks across all Docker containers; Redis AOF persistence for queue reliability; graceful worker termination.
- **Maintainability:** Minimal third-party dependencies; adherence to official Laravel 13 and React conventions.

