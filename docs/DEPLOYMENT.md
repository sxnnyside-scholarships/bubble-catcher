# Self-Hosted Deployment Guide

This guide details deployment options for **Bubble Catcher**, including standalone VPS hosting with Docker Compose, PaaS platforms (Coolify, Dokku), and decoupled frontend deployments (Netlify).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Environment Configuration](#3-environment-configuration)
4. [Deployment with Docker Compose (Recommended)](#4-deployment-with-docker-compose-recommended)
5. [Coolify Deployment](#5-coolify-deployment)
6. [Decoupled Deployment (Netlify + VPS Backend)](#6-decoupled-deployment-netlify--vps-backend)
7. [Database Setup & Migrations](#7-database-setup--migrations)
8. [Security & Docker Socket Isolation](#8-security--docker-socket-isolation)
9. [Operational Verification & Troubleshooting](#9-operational-verification--troubleshooting)

---

## 1. Architecture Overview

A production Bubble Catcher instance consists of four interconnected services:

```
                      ┌──────────────────────┐
                      │   Client Browser     │
                      └──────────┬───────────┘
                                 │ HTTP / HTTPS (:80 / :443)
                                 ▼
                      ┌──────────────────────┐
                      │  frontend (Nginx)    │
                      │  SPA + Reverse Proxy │
                      └──────────┬───────────┘
                                 │ /api/v1/* (Internal bridge network)
                                 ▼
                      ┌──────────────────────┐
                      │    backend (Bun)     │
                      │    Elysia REST API   │
                      └────┬────────────┬────┘
                           │            │
         SQL Data & Auth   │            │ Container Execution Commands
                           ▼            ▼
             ┌────────────────┐     ┌──────────────────────┐
             │    postgres    │     │     docker-proxy     │
             │   Postgres 16  │     │   (Restricted API)   │
             └────────────────┘     └──────────┬───────────┘
                                               │
                                               ▼
                                    ┌──────────────────────┐
                                    │ Host Docker Daemon   │
                                    │ (Ephemeral Sandboxes)│
                                    └──────────────────────┘
```

- **`frontend`**: High-performance Alpine Nginx container serving compiled static assets and reverse-proxying `/api/` to the backend.
- **`backend`**: Bun API server running Elysia, AST analysis engine, and sandbox lifecycle managers.
- **`postgres`**: Dedicated PostgreSQL 16 instance storing users, courses, assignments, telemetry, and projects.
- **`docker-proxy`**: Least-privilege proxy exposing only container creation and execution endpoints without host volume access.
- **`migrate`**: One-shot startup container running Drizzle ORM migrations and database triggers before backend launch.

---

## 2. Prerequisites

- **Host Operating System**: Linux (Ubuntu 22.04/24.04 LTS, Debian 12, Rocky Linux, or macOS for local development).
- **Compute Sizing**:
  - Minimum: 2 vCPU, 4 GB RAM, 20 GB SSD.
  - Recommended (Campus / Classroom): 4 vCPU, 8 GB RAM, 50 GB SSD.
- **Installed Software**:
  - Docker Engine (>= 24.0)
  - Docker Compose v2 (>= 2.20)
  - Git

---

## 3. Environment Configuration

Clone the repository and copy the environment template:

```bash
git clone https://github.com/sxnnyside-scholarships/bubble-catcher.git
cd bubble-catcher
cp backend/.env.example backend/.env
```

### Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | No | `80` | External HTTP port exposed by Nginx reverse proxy. |
| `POSTGRES_PASSWORD` | **Yes** | — | Strong password for the `bubble_catcher` database user. |
| `JWT_SECRET` | **Yes** | — | 32+ character random secret used for session authentication tokens. |
| `JWT_REFRESH_SECRET` | **Yes** | — | 32+ character random secret used for refresh token signing. |
| `DATABASE_URL` | No | Auto-configured | Connection string formatted as `postgres://bubble_catcher:<PASSWORD>@postgres:5432/bubble_catcher`. |
| `DOCKER_HOST` | No | `tcp://docker-proxy:2375` | Address of the socket proxy service. |
| `SANDBOX_MEMORY_LIMIT` | No | `268435456` | Memory limit per sandbox execution container (256 MB in bytes). |
| `SANDBOX_CPU_QUOTA` | No | `50000` | CPU quota in microseconds (equivalent to 0.5 CPU core). |
| `SANDBOX_TIMEOUT_MS` | No | `5000` | Maximum allowed query execution time before forceful container kill (5s). |

Generate cryptographically secure secrets with:

```bash
openssl rand -hex 32
```

---

## 4. Deployment with Docker Compose (Recommended)

1. Build the multi-dialect sandbox engine images:
   ```bash
   cd docker && bash build-images.sh && cd ..
   ```

2. Start the unified production stack:
   ```bash
   docker compose up -d
   ```

3. Verify service startup:
   ```bash
   docker compose ps
   ```

4. View unified logs:
   ```bash
   docker compose logs -f backend
   ```

5. Access the application in your browser at `http://YOUR_SERVER_IP`.
   - The first user to register automatically receives `admin` and instance ownership privileges.

---

## 5. Coolify Deployment

1. Create a new service in Coolify and choose **Docker Compose**.
2. Point Coolify to the repository URL:
   `https://github.com/sxnnyside-scholarships/bubble-catcher`
3. Under compose file path, select `/docker-compose.yml`.
4. Configure the environment variables in the Coolify dashboard (`POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`).
5. Set the build context to the repository root (`.`).
6. Deploy. Coolify handles automatic SSL/TLS termination via Traefik or Caddy.

---

## 6. Decoupled Deployment (Netlify + VPS Backend)

If you prefer hosting the frontend on a CDN while self-hosting the backend:

### Netlify Frontend Deployment
1. Connect your repository to Netlify.
2. Configure build settings:
   - **Base directory**: `.`
   - **Package directory**: `frontend`
   - **Build command**: `bun run build`
   - **Publish directory**: `frontend/dist`
3. Under **Environment Variables**, set:
   - `VITE_API_URL`: `https://api.yourdomain.com/api/v1`
4. Deploy. The included [`frontend/public/_redirects`](file:///Users/ti/Downloads/scholar/bubble-catcher/frontend/public/_redirects) automatically ensures SPA history navigation routes properly.

### Backend VPS Configuration
Expose the backend port in `docker-compose.yml` or bind through Caddy/Nginx with CORS allowed for your Netlify domain.

---

## 7. Database Setup & Migrations

Database schema changes are managed with Drizzle ORM. The `migrate` service in `docker-compose.yml` runs automatically on startup:

```bash
bun run db:migrate   # Applies all pending SQL migration files
bun run db:triggers  # Configures soft-delete triggers and security functions
```

To manually run migrations against a running database container:

```bash
docker compose run --rm migrate
```

---

## 8. Security & Docker Socket Isolation

Bubble Catcher executes student queries inside throwaway Docker containers. Exposing raw host sockets (`/var/run/docker.sock`) poses significant security risks in multi-user environments.

To address this:
- The backend communicates exclusively with `docker-proxy` (`tecnativa/docker-socket-proxy`).
- Host filesystem mounts (`VOLUMES: 0`), network modifications (`NETWORKS: 0`), and swarm management are forbidden at the socket level.
- An automated reaper (`backend/src/sandbox/reaper.ts`) cleans orphaned ephemeral containers older than 120 seconds every 2 minutes.

---

## 9. Operational Verification & Troubleshooting

### Check Backend Health Endpoint
```bash
curl -f http://localhost:3001/health
```
Expected response:
```json
{"status":"ok","service":"bubble-catcher-api","version":"2.0.0","dependencies":{"database":"ok","docker":"ok"}}
```

### Inspect Database Connection
```bash
docker compose exec postgres psql -U bubble_catcher -d bubble_catcher -c "SELECT COUNT(*) FROM users;"
```

### Restart Services
```bash
docker compose restart backend frontend
```

### Full Teardown
```bash
docker compose down -v   # WARNING: -v removes the postgres data volume
```
