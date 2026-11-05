###############################################################################
# ThinkCode Full-Stack Template — Nginx Gateway Dockerfile (Coolify / Traefik-aware)
#
# Multi-stage build:
#   Stage 1 (builder): Build React 19 + Tailwind CSS frontend with Node 22
#   Stage 2 (production): Nginx 1.27 + static assets + reverse proxy
###############################################################################

# ─── Stage 1: Build React Frontend ──────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /build

# Accept build-time env vars for Vite
ARG VITE_API_URL="/api/v1"
ARG VITE_APP_NAME="ThinkCode"
ARG VITE_APP_VERSION="1.0.0"

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Install dependencies first for layer caching
ENV NODE_ENV=development
COPY apps/frontend/package.json apps/frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund

# Copy source and build production bundle
COPY apps/frontend/ .
RUN npm run build

# ─── Stage 2: Production Nginx Gateway ───────────────────────────────────────
FROM nginx:1.27-alpine AS production

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy Coolify/Traefik-aware nginx configuration
COPY infra/coolify/docker/nginx/nginx.conf   /etc/nginx/nginx.conf
COPY infra/coolify/docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built React application from builder stage
COPY --from=builder /build/dist /usr/share/nginx/html

# Ensure proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80 3000

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/nginx-health || exit 1

CMD ["nginx", "-g", "daemon off;"]
