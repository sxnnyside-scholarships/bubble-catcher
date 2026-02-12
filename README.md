# Bubble Catcher

![Version](https://img.shields.io/badge/version-1.0.0-blueviolet)
![License](https://img.shields.io/badge/license-MIT-green)
![Runtime](https://img.shields.io/badge/runtime-Bun-f472b6)
![Frontend](https://img.shields.io/badge/frontend-SvelteKit%205-ff3e00)

**By Sxnnyside Project**

Bubble Catcher is an educational SQL analysis and sandboxed execution platform. It parses SQL queries, detects inefficiencies and unsafe patterns through a rule-based static analysis engine, suggests safer rewrites, and executes queries inside ephemeral Docker containers isolated from the host system.

Designed for students, educators, and developers who want to learn SQL by writing it, seeing what it does, and understanding what could go wrong -- without risk.

---

## Version 1.0.0 Highlights

- **Secure sandbox execution** -- Ephemeral Docker containers with network isolation, memory/CPU limits, and capability dropping
- **Plan-based rule system** -- Free and Premium analysis tiers with gated advanced rules
- **Advanced telemetry** -- Per-user execution metrics, dialect usage tracking, and success rate monitoring
- **Theme system** -- Light, Dark, and Vibrant themes with persistent user preferences
- **Saved query reuse** -- Save, search, and reinsert queries across projects
- **Structured error handling** -- Consistent HTTP error codes with i18n error messages
- **Security hardening** -- IP rate limiting, query guard, CORS validation, execution audit trail
- **Observability metrics** -- Structured JSON logging, request context propagation, telemetry dashboard
- **Icon system** -- Theme-aware favicons with PWA compatibility
- **Internationalization** -- Full English and Spanish support

---

## Vision

SQL education tools typically fall into two categories: static linters that flag errors without execution, and online sandboxes that execute queries without analysis. Bubble Catcher combines both: it analyzes your query before execution, explains what the analysis found, and then runs the query inside a disposable container so you can see results safely.

The platform supports multiple SQL dialects, letting learners compare how the same concepts work across MySQL, PostgreSQL, SQLite, MariaDB, and MSSQL.

---

## Architecture

```
bubble-catcher/
|
|-- backend/              Bun + Elysia API server
|   |-- src/
|   |   |-- analysis/     Rule engine (AST-based static analysis)
|   |   |-- config/       Environment configuration
|   |   |-- lib/          Shared utilities (errors, Supabase client)
|   |   |-- middleware/    Auth, profile provisioning, error handling
|   |   |-- routes/       REST API endpoints
|   |   |-- sandbox/      Docker container lifecycle management
|   |   `-- services/     Business logic orchestration
|   `-- supabase/
|       `-- schema.sql    Database schema (Supabase PostgreSQL)
|
|-- frontend/             SvelteKit + Monaco Editor
|   `-- src/
|       |-- lib/          API client, stores, i18n, components
|       `-- routes/       SvelteKit file-based routing
|
|-- shared/               TypeScript types shared across packages
|   `-- types/            Dialect, execution, analysis, project types
|
|-- docker/               Sandbox container definitions
|   |-- sqlite/           Alpine + sqlite3
|   |-- postgres/         PostgreSQL 16 (Alpine)
|   |-- mysql/            MySQL 8.0
|   |-- mariadb/          MariaDB 11
|   |-- mssql/            SQL Server 2022
|   `-- seed/             Seed SQL for each dialect
|
`-- Makefile              Monorepo orchestration
```

### Request lifecycle

```
Browser
  |
  |  POST /api/v1/execution/execute
  |  Authorization: Bearer <supabase-jwt>
  v
Elysia Server (Bun)
  |
  |-- errorHandler           (global -- catches all errors)
  |-- authMiddleware          (validates JWT via Supabase)
  |-- ensureProfileMiddleware (auto-provisions user profile)
  |
  v
executionRoutes
  |
  v
ExecutionService
  |-- Validates input
  |-- Calls SandboxService.execute(sql, dialect)
  |   |
  |   v
  |   DockerSandboxExecutor
  |   |-- Creates ephemeral container
  |   |-- [Server-based] Polls readiness, then exec query
  |   |-- [Non-server]   Runs query as container Cmd
  |   |-- Parses output (TSV / MSSQL format)
  |   `-- Destroys container (finally block)
  |
  `-- Records execution in bubble_execution_history
  |
  v
JSON response -> Browser
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Bun | Fast JavaScript/TypeScript runtime |
| Backend framework | Elysia | Type-safe HTTP framework for Bun |
| Frontend framework | SvelteKit 2 + Svelte 5 | Reactive UI with file-based routing |
| SQL editor | Monaco Editor | VS Code editor component in the browser |
| Styling | TailwindCSS 4 | Utility-first CSS |
| Database | Supabase PostgreSQL | User data, projects, execution history |
| Auth | Supabase Auth | JWT-based authentication |
| SQL analysis | node-sql-parser | SQL to AST parsing for static analysis |
| Sandbox | Docker (dockerode) | Ephemeral container per query execution |
| Validation | Zod | Runtime schema validation |
| Shared types | TypeScript | Monorepo-shared type definitions |

---

## Monorepo Structure

The project uses a flat monorepo layout without a package manager workspace. Each package manages its own dependencies:

- **`backend/`** -- Bun-managed. Install with `bun install`.
- **`frontend/`** -- npm-managed. Install with `npm install`.
- **`shared/`** -- Pure TypeScript types, no dependencies. Imported via path aliases (`$shared/*` in frontend, `@shared/*` in backend).
- **`docker/`** -- Dockerfiles and seed SQL. No package manager.

The root `Makefile` orchestrates cross-package commands.

---

## Sandbox Architecture

Every query execution creates an isolated, ephemeral Docker container. The container is destroyed after the query completes (or times out), regardless of success or failure.

**Two execution paths:**

1. **Non-server dialects (SQLite):** The container runs a single shell command that pipes seed SQL and the user query into `sqlite3 :memory:`. The container exits when the command finishes. No database server is started.

2. **Server-based dialects (PostgreSQL, MySQL, MariaDB, MSSQL):** The container starts with its default entrypoint, which boots the database server and applies seed data. The executor polls a dialect-specific health check via `container.exec()` until the server is ready, then executes the user query via a second `container.exec()` call.

**Security constraints (all dialects):**

- Network disabled (`NetworkMode: none`)
- Memory limited (default 128 MB)
- CPU limited (default 0.5 cores)
- Timeout enforced (default 10 seconds)
- Capabilities dropped (`CapDrop: ALL`)
- No new privileges (`no-new-privileges`)
- Container forcibly removed in `finally` block

---

## Supported SQL Dialects

| Dialect | Image | Status |
|---|---|---|
| SQLite | `bubble-catcher-sqlite:latest` | Supported |
| PostgreSQL | `bubble-catcher-postgres:latest` | Supported |
| MySQL | `bubble-catcher-mysql:latest` | Supported |
| MariaDB | `bubble-catcher-mariadb:latest` | Supported |
| MSSQL | `bubble-catcher-mssql:latest` | Supported |
| Oracle | -- | Planned (enterprise) |

---

## Authentication Flow

1. The frontend authenticates the user via Supabase Auth (email/password).
2. Supabase returns a JWT session token.
3. Every API request includes `Authorization: Bearer <token>`.
4. The backend `authMiddleware` validates the JWT by calling `supabaseAdmin.auth.getUser(token)`.
5. The `ensureProfileMiddleware` checks for an existing `bubble_profiles` row and creates one if missing (with race-condition handling).
6. Route handlers receive a typed `AuthContext` with `userId`, `email`, and `accessToken`.

---

## Running Locally

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Node.js](https://nodejs.org) >= 20
- [Docker Desktop](https://docker.com) (running)
- A [Supabase](https://supabase.com) project with the schema applied

### Step 1: Clone the repository

```bash
git clone https://github.com/HoujouSxnnyside/bubble-catcher.git
cd bubble-catcher
```

### Step 2: Install dependencies

```bash
make install
```

### Step 3: Configure environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit both `.env` files with your Supabase project credentials.

### Step 4: Apply the database schema

Open the Supabase SQL Editor and run the contents of `backend/supabase/schema.sql`.

### Step 5: Build Docker sandbox images

```bash
make docker-build
```

### Step 6: Start the development servers

```bash
make dev
```

This starts both the backend (port 3001) and frontend (port 5173) concurrently.

### Step 7: Open the application

Navigate to `http://localhost:5173` in your browser.

---

## Analysis Rules

The rule engine performs AST-based static analysis on SQL queries before execution. Each rule inspects the parsed syntax tree and returns structured issues with severity, explanation, and suggested rewrites.

| Rule | Severity | Detects |
|---|---|---|
| `select-star` | warning | `SELECT *` usage |
| `missing-where` | error | `UPDATE`/`DELETE` without `WHERE` |
| `cartesian-join` | warning | Implicit cross joins |
| `subquery-optimization` | info | Subqueries convertible to JOINs |
| `unsafe-pattern` | error | `DROP`, `TRUNCATE`, `GRANT`, multi-statement |
| `order-without-limit` | info | `ORDER BY` without `LIMIT` |
| `leading-wildcard` | warning | `LIKE '%...'` preventing index usage |
| `group-by-inconsistency` | warning | Non-aggregated columns missing from `GROUP BY` |
| `broad-time-condition` | warning | `DELETE`/`UPDATE` with broad date range |
| `join-on-non-id` | info | `JOIN` on non-key columns |
| `contradictory-conditions` | error | Contradictory `AND` conditions (always false) |

---

## Known Limitations

- MSSQL sandbox runs under Rosetta emulation on Apple Silicon (slower startup).
- Oracle dialect is reserved for a future enterprise plan and is not yet implemented.
- The sandbox does not persist data between executions; each query starts from a clean seed.
- The analysis engine operates on AST heuristics, not query plans. Some false positives are expected.
- Seed data is small and fixed. Users cannot upload custom datasets.
- The frontend disables SSR due to Monaco Editor requirements.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full development roadmap with pass-by-pass progress.

**Upcoming:**

- Oracle dialect support (enterprise plan).
- Custom seed data upload per project.
- Query plan visualization (EXPLAIN integration).
- Collaborative project sharing.
- Additional analysis rules (window function misuse, index suggestions).
- AI-powered query rewrite suggestions.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Contact

- **General support:** support.sxnnyside@sxnnysideproject.com
- **Security issues:** security.sxnnyside@sxnnysideproject.com (see [SECURITY.md](SECURITY.md))
