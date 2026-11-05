# ThinkCode Full-Stack Template — Developer Makefile

COMPOSE = docker compose --env-file .env -f infra/docker-compose.yml -f infra/docker-compose.dev.yml
COMPOSE_PROD = docker compose --env-file .env -f infra/docker-compose.yml

.PHONY: help setup up up-deps down restart logs ps migrate seed test test-backend test-frontend build dev-frontend dev-backend shell-backend shell-frontend clean

help:
	@echo "ThinkCode Full-Stack Template"
	@echo "=============================="
	@echo "Available commands:"
	@echo "  make setup          - Initialize local development environment (.env, composer, npm, key)"
	@echo "  make up             - Build and start full Docker stack (local dev ports enabled)"
	@echo "  make up-deps        - Start only PostgreSQL & Redis services in Docker"
	@echo "  make down           - Stop and remove Docker containers"
	@echo "  make restart        - Restart Docker containers"
	@echo "  make logs           - Follow Docker container logs"
	@echo "  make ps             - List running Docker containers"
	@echo "  make migrate        - Run database migrations in backend container"
	@echo "  make seed           - Seed database in backend container"
	@echo "  make test           - Run both backend and frontend test suites"
	@echo "  make test-backend   - Run Laravel PHPUnit test suite"
	@echo "  make test-frontend  - Run React Vitest test suite"
	@echo "  make build          - Build production frontend bundle and Docker images"
	@echo "  make dev-frontend   - Start Vite frontend dev server locally on host"
	@echo "  make dev-backend    - Start Laravel API dev server locally on host"
	@echo "  make shell-backend  - Open an interactive shell in the backend container"
	@echo "  make clean          - Clean local build artifacts, caches, and test logs"

setup:
	@echo "==> Setting up ThinkCode Full-Stack Template..."
	@test -f .env || cp .env.example .env
	@test -f apps/backend/.env || cp apps/backend/.env.example apps/backend/.env
	@test -f apps/frontend/.env || cp apps/frontend/.env.example apps/frontend/.env
	@echo "==> Installing backend dependencies..."
	@cd apps/backend && composer install
	@echo "==> Generating backend application key..."
	@cd apps/backend && php artisan key:generate --force
	@echo "==> Installing frontend dependencies..."
	@cd apps/frontend && npm install
	@echo "==> Setup completed successfully."

up:
	@echo "==> Starting Docker stack..."
	$(COMPOSE) up -d --build

up-deps:
	@echo "==> Starting PostgreSQL and Redis containers..."
	$(COMPOSE) up -d postgres redis

down:
	@echo "==> Stopping Docker stack..."
	$(COMPOSE) down

restart: down up

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

migrate:
	$(COMPOSE) exec backend php artisan migrate --force

seed:
	$(COMPOSE) exec backend php artisan db:seed --force

test: test-backend test-frontend

test-backend:
	@echo "==> Running backend PHPUnit tests..."
	@cd apps/backend && php artisan test

test-frontend:
	@echo "==> Running frontend Vitest tests..."
	@cd apps/frontend && npm test

build:
	@echo "==> Building frontend production bundle..."
	@cd apps/frontend && npm run build
	@echo "==> Building Docker images..."
	$(COMPOSE_PROD) build

dev-frontend:
	@cd apps/frontend && npm run dev

dev-backend:
	@cd apps/backend && php artisan serve --host=0.0.0.0 --port=8000

shell-backend:
	$(COMPOSE) exec backend sh

shell-frontend:
	$(COMPOSE) exec nginx sh

clean:
	@echo "==> Cleaning caches and artifacts..."
	@rm -rf apps/frontend/dist apps/backend/storage/framework/cache/data/* apps/backend/storage/framework/views/*
	@cd apps/backend && php artisan config:clear && php artisan cache:clear || true
