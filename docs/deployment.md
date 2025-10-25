# Deployment Guide

## Environment Variables
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `REVALIDATE_SECRET`
- `REDIS_URL`
- `SENTRY_DSN`
- `SENTRY_SECRET_KEY`

## Docker
1. `docker-compose up --build`
2. App on `http://localhost:3000`
3. Prometheus: `http://localhost:9090`
4. Sentry: `http://localhost:9000`

## CI/CD
- GitHub Actions configured in `.github/workflows/ci.yml`
- Runs lint, unit & E2E tests on push/pull requests
