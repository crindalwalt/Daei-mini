#!/bin/sh
###############################################################################
# ThinkCode — Backend PHP-FPM Entrypoint
#
# Execution Lifecycle:
#   1. Wait for PostgreSQL if TCP host is configured
#   2. Validate APP_KEY (fail-fast in production; generate in local dev if permitted)
#   3. Execute database migrations if explicitly enabled (RUN_MIGRATIONS=true)
#   4. Optionally seed database if explicitly enabled (RUN_SEED=true)
#   5. Create storage symlink (php artisan storage:link) for HTTP service
#   6. Warm configuration and route caches if enabled (RUN_CACHE=true)
#   7. Pass execution to process CMD (php-fpm, queue worker, or scheduler)
###############################################################################
set -e

echo "==> ThinkCode backend entrypoint initialized (Process: $@)"

# ── 1. Wait for Database (PostgreSQL) ────────────────────────────────────────
wait_for_database() {
    echo "==> Checking database connection at ${DB_HOST:-postgres}:${DB_PORT:-5432}..."
    until php -r '
        $host = getenv("DB_HOST") ?: "postgres";
        $port = getenv("DB_PORT") ?: "5432";
        $conn = @fsockopen($host, (int)$port, $errno, $errstr, 5);
        if ($conn) { fclose($conn); exit(0); }
        exit(1);
    '; do
        echo "   Database not reachable yet — retrying in 2s..."
        sleep 2
    done
    echo "==> Database is reachable"
}

if [ "${DB_CONNECTION}" != "sqlite" ] && [ -n "${DB_HOST}" ]; then
    wait_for_database
fi

cd /var/www/backend

# Ensure no stale bootstrap caches exist from host or prior builds
rm -f bootstrap/cache/*.php

# ── 2. Validate APP_KEY (Fail-fast in production) ───────────────────────────
if [ -z "${APP_KEY}" ]; then
    if [ "${APP_ENV}" = "production" ]; then
        echo "CRITICAL: APP_KEY is unset in production environment. Aborting startup to prevent session invalidation and data loss." >&2
        exit 1
    elif [ "${GENERATE_APP_KEY:-true}" = "true" ]; then
        echo "==> NOTICE: APP_KEY not provided in development — auto-generating key"
        touch /var/www/backend/.env
        php artisan key:generate --force
    else
        echo "ERROR: APP_KEY is missing and GENERATE_APP_KEY is false. Aborting startup." >&2
        exit 1
    fi
fi

# ── 3. Database Migrations ──────────────────────────────────────────────────
# Default to false in production to prevent concurrent multi-container migration race conditions.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
    echo "==> Executing database migrations"
    php artisan migrate --force
fi

# ── 4. Database Seeding ─────────────────────────────────────────────────────
if [ "${RUN_SEED:-false}" = "true" ]; then
    echo "==> Seeding database"
    php artisan db:seed --force
fi

# ── 5. Storage Symlink & Caching (Primary HTTP process only) ────────────────
if [ "$1" = "php-fpm" ]; then
    echo "==> Ensuring public storage link"
    php artisan storage:link --force 2>/dev/null || true

    if [ "${RUN_CACHE:-false}" = "true" ]; then
        echo "==> Warming Laravel production caches"
        php artisan config:cache || true
        php artisan route:cache || true
        php artisan view:cache || true
    fi
fi

echo "==> Handing off to process: $@"
exec "$@"
