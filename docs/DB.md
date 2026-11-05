# ThinkCode Full-Stack Template — Database Architecture & Operations

## 1. Database Overview

The ThinkCode starter template uses **PostgreSQL 17** (pinned Alpine image `postgres:17-alpine`) as its primary relational database.

- **Engine:** PostgreSQL 17.x
- **Collation / Encoding:** UTF-8
- **Port:** Default PostgreSQL 5432 internally; exposed on port 5433 for local host development (`FORWARD_DB_PORT=5433`).
- **Connection string format:** `pgsql://thinkcode_user:thinkcode_db_secret@postgres:5432/thinkcode`

---

## 2. Relational Schema & Migrations

The database baseline migrations reside in `apps/backend/database/migrations/`:

### Core Tables

1. **`users`**
   - `id` (bigserial, primary key)
   - `name` (varchar 255)
   - `email` (varchar 255, unique, indexed)
   - `email_verified_at` (timestamp, nullable)
   - `password` (varchar 255, bcrypt hashed)
   - `remember_token` (varchar 100, nullable)
   - `created_at`, `updated_at` (timestamps)

2. **`password_reset_tokens`**
   - `email` (varchar 255, primary key)
   - `token` (varchar 255)
   - `created_at` (timestamp, nullable)

3. **`sessions`**
   - `id` (varchar 255, primary key)
   - `user_id` (bigint, nullable, indexed)
   - `ip_address` (varchar 45, nullable)
   - `user_agent` (text, nullable)
   - `payload` (longtext)
   - `last_activity` (integer, indexed)
   *(Used when `SESSION_DRIVER=database`; template defaults to Redis in production).*

4. **`cache` and `cache_locks`**
   - High-throughput key-value storage used if `CACHE_STORE=database`.

5. **`jobs`, `job_batches`, `failed_jobs`**
   - Queue storage used if `QUEUE_CONNECTION=database` and dead-letter queue records for failed jobs.

6. **`personal_access_tokens`**
   - Created by `Laravel\Sanctum`.
   - `tokenable_type`, `tokenable_id` (morphs)
   - `name` (varchar)
   - `token` (varchar 64, SHA-256 hashed)
   - `abilities` (text, nullable)
   - `last_used_at`, `expires_at` (timestamps)

---

## 3. Database Operations & Commands

### Running Migrations
From host:
```bash
make migrate
```
Or inside backend container:
```bash
php artisan migrate --force
```

### Seeding Baseline Data
Seeds default developer account in local and testing environments only (`admin@thinkcode.dev` / `password`):
```bash
make seed
```
> [!SECURITY]
> In production environments (`APP_ENV=production`), `DatabaseSeeder` automatically skips default demo credentials to prevent accidental administrative account exposure. In production, initial administrative users should be provisioned via interactive Artisan CLI commands.

---

## 4. Backup and Restore Strategy

### Automated Backup via `pg_dump`
To create a compressed binary dump of the PostgreSQL database:

```bash
# Export compressed backup
docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres \
  pg_dump -U thinkcode_user -F c -b -v -f /tmp/thinkcode_backup.dump thinkcode

# Copy backup out of container to host
docker compose --env-file .env -f infra/docker-compose.yml cp postgres:/tmp/thinkcode_backup.dump ./backups/$(date +%Y%m%d_%H%M%S)_thinkcode.dump
```

### Database Restoration via `pg_restore`
To restore a database dump into PostgreSQL:

```bash
# Copy dump into container
docker compose --env-file .env -f infra/docker-compose.yml cp ./backups/your_backup.dump postgres:/tmp/restore.dump

# Clean and restore database
docker compose --env-file .env -f infra/docker-compose.yml exec -T postgres \
  pg_restore -U thinkcode_user -d thinkcode --clean --if-exists -v /tmp/restore.dump
```

---

## 5. Redis Persistence Policy

Redis 7 is configured with **Append-Only File (AOF)** persistence (`--appendonly yes`) on persistent volume `thinkcode_redis_data`:

- **Cache Data:** Disposable; transient cache entries have explicit TTLs.
- **Session Data:** Survives container restarts via Redis AOF persistence.
- **Queue Broker:** Asynchronous jobs queued in Redis are written to append log, preventing job loss during container restarts or deployments.

