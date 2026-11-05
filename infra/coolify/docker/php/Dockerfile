###############################################################################
# ThinkCode Full-Stack Template — Laravel 13 / PHP 8.4-FPM Dockerfile
#
# Multi-stage build:
#   Stage 1 (composer): Install production PHP dependencies
#   Stage 2 (production): PHP 8.4-FPM on Alpine with PostgreSQL and Redis
###############################################################################

# ─── Stage 1: Composer Dependencies ─────────────────────────────────────────
FROM composer:2 AS composer

WORKDIR /app

# Copy composer files for layer caching
COPY apps/backend/composer.json apps/backend/composer.lock* ./

# Install production dependencies
RUN composer install \
        --no-interaction \
        --no-dev \
        --prefer-dist \
        --optimize-autoloader \
        --no-scripts \
        --ignore-platform-reqs

# ─── Stage 2: Production PHP-FPM ────────────────────────────────────────────
FROM php:8.4-fpm-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
        postgresql-client \
        libpq \
        sqlite \
        sqlite-libs \
        libzip \
        freetype \
        libpng \
        libjpeg-turbo \
        icu-libs \
        oniguruma \
        zip \
        unzip \
        wget \
        git \
        procps \
        $PHPIZE_DEPS

# Install PHP extensions via official installer
COPY --from=mlocati/php-extension-installer /usr/bin/install-php-extensions /usr/local/bin/

RUN install-php-extensions \
        opcache \
        pcntl \
        bcmath \
        intl \
        exif \
        gd \
        zip \
        pdo_pgsql \
        pgsql \
        pdo_sqlite \
        redis

# Copy custom php.ini and php-fpm pool configuration
COPY infra/coolify/docker/php/php.ini /usr/local/etc/php/conf.d/zz-thinkcode.ini
COPY infra/coolify/docker/php/zz-thinkcode.conf /usr/local/etc/php-fpm.d/zz-thinkcode.conf

# Set application directory
WORKDIR /var/www/backend

# Copy Composer vendor directory from Stage 1
COPY --from=composer /app/vendor /var/www/backend/vendor

# Copy backend application source
COPY apps/backend/ /var/www/backend/

# Ensure storage and bootstrap cache directories exist with correct permissions
RUN mkdir -p \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/framework/testing \
        storage/logs \
        bootstrap/cache \
    && chown -R www-data:www-data /var/www/backend/storage /var/www/backend/bootstrap/cache \
    && chmod -R 775 /var/www/backend/storage /var/www/backend/bootstrap/cache

# Copy and configure entrypoint
COPY infra/coolify/docker/php/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["php-fpm", "-F"]
