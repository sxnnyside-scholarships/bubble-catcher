# Bubble Catcher -- Backend

> **Sxnnyside Project** -- Educational SQL analysis and sandboxed execution platform.
> Self-hosted, no external SaaS dependency (no Supabase) — bring your own Postgres.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) 1.4.x |
| Framework | [Elysia](https://elysiajs.com) v1.4.x |
| Language | TypeScript 5.9 (strict mode) |
| Database | Self-hosted PostgreSQL via [Drizzle ORM](https://orm.drizzle.team) |
| Auth | Own JWT (`@elysiajs/jwt`) + `Bun.password` (argon2id) — no external auth provider |
| SQL Parser | [node-sql-parser](https://github.com/nicolewhite/node-sql-parser) v5.4 |
| Sandbox | [Dockerode](https://github.com/apocas/dockerode) v4 -- ephemeral container per query |

There are no plan tiers. A self-hosted instance is single-access-level: the
first account created becomes `role: 'admin'` (instance operator), every
account after that is `role: 'user'`. Limits (projects, query length, rate
limits) are instance-wide, set via environment variables — not per-user.

---

## Architecture Breakdown

```
src/
|-- index.ts                   Entry point -- Elysia server with CORS, error handler, routes
|-- config/
|   |-- env.ts                 Typed environment config loader (requireEnv + defaults)
|   `-- index.ts               Barrel export
|-- db/
|   |-- schema.ts              Drizzle schema (users, projects, saved queries, history, audit, telemetry)
|   |-- client.ts              Drizzle instance (postgres-js driver), shared across services
|   |-- soft-delete.ts         notDeleted()/softDeleteNow() helpers -- rows are never hard-deleted
|   `-- triggers.sql           Portable PL/pgSQL updated_at triggers, applied after drizzle-kit migrate
|-- dto/
|   |-- user.dto.ts            DB row -> UserProfile API shape (never leaks passwordHash)
|   |-- project.dto.ts         DB row -> Project/SavedQuery API shape
|   `-- execution.dto.ts       DB row -> ExecutionHistoryEntry API shape
|-- lib/
|   |-- auth.ts                hashPassword/verifyPassword (Bun.password, argon2id)
|   |-- errors.ts              AppError class (code, statusCode, details)
|   |-- response.ts            success() / error() structured response helpers
|   `-- query-guard.ts         AST-based structural guard (node-sql-parser) -- blocks dangerous queries
|-- middleware/
|   |-- auth.ts                JWT verification -> AuthContext { userId, email, role }
|   |-- require-admin.ts       403s any request where auth.role !== 'admin'
|   |-- error-handler.ts       Global AppError / ValidationError -> JSON response
|   `-- index.ts               Barrel export
|-- routes/
|   |-- index.ts               Barrel export
|   |-- auth.routes.ts         /auth/signup, /auth/login, /auth/me
|   |-- admin.routes.ts        /admin/* -- instance-wide views, admin-only
|   |-- project.routes.ts      CRUD for projects and saved queries
|   |-- user.routes.ts         Profile retrieval and preference updates
|   |-- analysis.routes.ts     SQL analysis endpoint
|   `-- execution.routes.ts    SQL execution endpoint + enabled-dialects list
|-- services/
|   |-- index.ts               Barrel export
|   |-- project.service.ts     Project and saved-query persistence (Drizzle)
|   |-- user.service.ts        Profile reads and updates (Drizzle)
|   |-- analysis.service.ts    Orchestrates analysis engine
|   |-- execution.service.ts   Orchestrates sandbox + history recording
|   |-- usage-limits.ts        Instance-wide limits (no plan tiers)
|   |-- rate-limiter.ts        In-memory sliding-window limiter
|   |-- audit.service.ts       Execution audit log (hash-only, no raw SQL)
|   `-- telemetry.service.ts   Usage telemetry + aggregation (per-user or instance-wide)
|-- sandbox/
|   |-- executor.interface.ts  SandboxExecutor interface contract
|   |-- docker-executor.ts     Docker-based executor (two-path architecture)
|   |-- service.ts             SandboxService (dialect -> executor mapping)
|   `-- index.ts               Barrel export
`-- analysis/
    |-- engine.ts              AnalysisEngine -- runs all rules against parsed AST (no tier gating)
    |-- rule.interface.ts      AnalysisRule interface
    `-- rules/                 17 rules, all always active

drizzle/                       Generated SQL migrations (drizzle-kit generate)
drizzle.config.ts              Drizzle Kit config (dialect: postgresql)
```

---

## Auth & RBAC

1. Frontend sends `Authorization: Bearer <accessToken>` with every API request.
2. `authMiddleware` verifies the JWT locally (`@elysiajs/jwt`, HMAC with `JWT_SECRET`) — no external call, no external provider.
3. Route handlers receive `auth: { userId, email, role }`.
4. `requireAdmin` (used only by `/admin/*`) 403s unless `role === 'admin'`.
5. Every other service filters explicitly by `userId` — there is no Row Level Security; access control lives entirely in the application layer (see `db/schema.ts` for why).

**Bootstrap:** the first `/auth/signup` on a fresh instance becomes `role: 'admin'` (race-safe via `pg_advisory_xact_lock` — two concurrent first-signups can't both become admin). There is no separate admin-provisioning step.

### Token lifecycle

`/auth/login` and `/auth/signup` return **both** an `accessToken` (short-lived, default 15m, stateless JWT) and a `refreshToken` (long-lived, default 30d, opaque random string — only its SHA-256 hash is stored in `refresh_tokens`).

- `POST /auth/refresh { refreshToken }` — exchanges a valid refresh token for a new access token **and rotates the refresh token** (the presented one is revoked, a new one issued). A trade-off worth knowing: because the access token is a stateless JWT, suspending/demoting a user or revoking their sessions takes effect immediately at `/auth/login` and `/auth/refresh`, but an *already-issued* access token remains valid until its own (short) expiry — there is no per-request DB check for revocation. Shorten `ACCESS_TOKEN_EXPIRES_IN` if that window is too wide for your threat model.
- `POST /auth/logout { refreshToken }` — revokes one session/device.
- Password change (`PATCH /user/password`), password reset (`POST /auth/reset-password`), self-deactivation (`DELETE /user/account`), and admin suspend/demote/force-logout all call `revokeAllRefreshTokens` — "log out everywhere".

### Account lifecycle

- `POST /auth/forgot-password { email }` — always 200 regardless of whether the email exists (no account-enumeration oracle). If it exists, a password-reset token is created and handed to `lib/mailer.ts`.
- `POST /auth/reset-password { token, newPassword }`.
- `POST /auth/verify-email { token }`, `POST /auth/resend-verification` (authenticated).
- `PATCH /user/password`, `PATCH /user/email` (both require `currentPassword`).
- `DELETE /user/account { password }` — self-service soft delete (never a hard DELETE).
- Admin: `PATCH /admin/users/:id { role?, status? }` (promote/demote, suspend/reactivate — an admin cannot modify their own row this way, to avoid locking themselves out), `POST /admin/users/:id/force-logout`.

**No email provider is wired in.** `lib/mailer.ts` is a stub that logs the reset/verification link at `info` level instead of sending an email — replace it (Resend, SES, self-hosted SMTP, whatever) before exposing signup to untrusted users; logging the link means anyone with log access can hijack a password reset.

### Pagination

`GET /projects`, `GET /admin/users`, `GET /admin/projects`, and `GET /execution/history/:projectId` accept `?page=&pageSize=` (default 20, max 100) and return `{ items, total, page, pageSize, hasMore }` (see `lib/pagination.ts`, `shared/types/api.ts#PaginatedResponse`).

### Elysia Plugin Hook Propagation

Elysia >= 1.1 changed plugin lifecycle hooks to be local-scoped by default. A `derive()`/`onBeforeHandle()` defined inside a plugin only applies to routes within that plugin instance unless marked `.as('scoped')` (Elysia 1.4; older versions used the now-removed `.as('plugin')` name for the same concept). Both `authMiddleware` and `requireAdmin` use `.as('scoped')` for this reason — without it, routes outside the middleware plugin would receive `auth` as `undefined` and 500 instead of 401/403.

---

## Rule Engine

The analysis engine parses SQL into an AST using `node-sql-parser` and runs all 17 rules against the tree — there is no plan-tier gating; every rule is always active for every user.

### How to Extend: Writing a New Rule

1. Create a file in `src/analysis/rules/` following the naming convention `<rule-name>.rule.ts`.
2. Implement the `AnalysisRule` interface (`id`, `name`, `description`, `analyze(ast, originalQuery)`).
3. Export the class from `src/analysis/rules/index.ts`.
4. Register the rule in the `AnalysisEngine` constructor in `src/analysis/engine.ts`.

---

## Sandbox

### Two-Path Architecture

**Non-server path (SQLite, libSQL):** the query is written into the container as `/tmp/query.sql` via `container.putArchive()` before the container starts, then a fixed command reads that file (`cat /tmp/seed.sql /tmp/query.sql | sqlite3 ...`) — the SQL is never interpolated into a shell string or relied upon to signal EOF over stdin.

**Server-based path (PostgreSQL, MySQL, MariaDB, MSSQL):** container starts with the default entrypoint, the executor polls a health-check command via `container.exec()`, then runs the user query as a single `argv` element passed to `container.exec({ Cmd: [...] })` — never through a shell, so no escaping is needed or possible.

### Container Security

- `NetworkMode: 'none'` + `NetworkDisabled: true` -- no network access
- `SecurityOpt: ['no-new-privileges']` -- prevent privilege escalation
- `CapDrop: ['ALL']` on the non-server path only. Server-based images start as root to `chown`/`chmod` their data directory and drop privileges themselves (needs `CHOWN`/`SETUID`/`DAC_OVERRIDE`) — dropping all capabilities there makes them fail to start.
- `NanoCpus` derived from `SANDBOX_CPU_LIMIT`
- Memory limit from `SANDBOX_MEMORY_LIMIT`
- Timeout enforced via `Promise.race` with a timer

### Enabling/Disabling Dialects

The operator controls which sandbox dialects this instance runs via `SANDBOX_ENABLED_DIALECTS` (comma-separated). Executing against a disabled dialect returns `400 DIALECT_DISABLED`. `GET /api/v1/execution/dialects` exposes the enabled list for the frontend's dialect picker. MSSQL needs ~2GB RAM to start reliably — leave it out of the list on small VPS instances.

### Query Guard

`lib/query-guard.ts` parses the query with `node-sql-parser` and inspects the AST directly (recursive CTEs, unfiltered CROSS JOINs, unbounded `SELECT *`, `generate_series` without `LIMIT`, excessive `UNION`s) instead of matching regex against the raw string — this closes evasion gaps a regex-only guard has (e.g. a recursive CTE that doesn't have "RECURSIVE" adjacent to "WITH" in a way regex expects). Unparseable SQL is blocked, not passed through.

---

## Environment Variables

See `.env.example` for the full list with defaults. Key ones:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `JWT_SECRET` | Yes | ≥32 chars, used to sign/verify access-token JWTs |
| `ACCESS_TOKEN_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_IN_DAYS` | No | Token lifetimes (default `15m` / `30`) |
| `PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES` / `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN_HOURS` | No | Default `30` / `24` |
| `CORS_ORIGIN` | No | Allowed origin(s), comma-separated, no wildcard |
| `SANDBOX_ENABLED_DIALECTS` | No | Comma-separated dialects this instance runs (default `sqlite,postgresql`) |
| `SANDBOX_TIMEOUT_MS` / `SANDBOX_MEMORY_LIMIT` / `SANDBOX_CPU_LIMIT` | No | Per-execution container limits |
| `MAX_PROJECTS_PER_USER` / `MAX_QUERY_LENGTH` / `MAX_EXECUTIONS_PER_MINUTE` / `MAX_ANALYSIS_PER_MINUTE` | No | Instance-wide usage limits (no plan tiers) |

---

## Database Setup

```bash
# 1. Point DATABASE_URL at your Postgres instance (see .env.example)

# 2. Generate + apply the schema
bun run db:generate   # writes SQL into drizzle/ (already generated once; re-run after schema.ts changes)
bun run db:migrate    # applies drizzle/*.sql to DATABASE_URL

# 3. Apply the updated_at triggers (not modeled by Drizzle's schema DSL)
psql "$DATABASE_URL" -f src/db/triggers.sql
```

Tables (`db/schema.ts`): `users`, `bubble_projects`, `bubble_saved_queries`, `bubble_execution_history` (append-only), `bubble_execution_audit` (append-only, hash-only), `bubble_telemetry` (append-only), `refresh_tokens`, `password_reset_tokens`, `email_verification_tokens` (all three append-only, hash-only — see Auth & RBAC above).

`users`, `bubble_projects`, `bubble_saved_queries` support **soft delete** (`deleted_at`) — services never issue a hard `DELETE`; a periodic purge of old soft-deleted rows is left as an operator concern. There is no Row Level Security: access control is enforced entirely in the service layer.

---

## Self-Host Deployment (docker-compose)

`../docker-compose.yml` (repo root) runs `postgres` + this backend. It intentionally does **not** include the frontend yet (still on the pre-refactor Supabase client — see the Vue migration plan). Quick start:

```bash
cp backend/.env.example backend/.env   # fill in JWT_SECRET, CORS_ORIGIN, FRONTEND_URL, SMTP_*
export POSTGRES_PASSWORD=$(openssl rand -base64 24)   # or put it in a root .env
docker compose up -d postgres
docker compose run --rm migrate                        # applies schema + triggers
cd docker && ./build-images.sh && cd ..                # sandbox dialect images, on the HOST daemon
docker compose up -d backend
```

**Read this before exposing it publicly:**
- `backend/Dockerfile` mounts the **host's Docker socket** into the backend container (Docker-out-of-Docker) so it can manage sibling sandbox containers. This means a compromise of the backend process is effectively a compromise of the host's Docker daemon — run this only on a host you trust, never share that socket with any other container, and keep this backend's attack surface (deps, auth) as tight as possible.
- `SANDBOX_IMAGE_TAG` defaults to `1.0.0`, not `latest` — rebuilding sandbox images with `build-images.sh` does not silently change what a running instance executes until you bump this env var and restart.
- Set `SMTP_HOST` (see `.env.example`) before real users sign up — without it, password-reset/verification links only appear in `docker logs`, not in anyone's inbox.
- `CORS_ORIGIN` has no `localhost` fallback in `NODE_ENV=production` — the process refuses to boot without it set explicitly.

## Docker Requirements (sandbox execution)

- Docker Desktop or Docker Engine must be running, and its socket accessible to the Bun process.
- Build the images for every dialect you enable via `SANDBOX_ENABLED_DIALECTS`:

```bash
cd ../docker && bash build-images.sh
```

---

## Development Workflow

```bash
# Install dependencies
bun install

# Copy env template and fill in DATABASE_URL / JWT_SECRET
cp .env.example .env

# Apply schema (see Database Setup above)
bun run db:migrate
psql "$DATABASE_URL" -f src/db/triggers.sql

# Start with file watching
bun run dev

# Type-check only (no emit)
bun run typecheck

# Lint / format
bun run lint
bun run format

# Unit tests (query guard, analysis engine, auth hashing/tokens, pagination —
# pure logic only; nothing here spins up Postgres or Docker, see Testing below)
bun test

# Production start
bun run start
```

The API server starts at `http://localhost:3001`. All routes are grouped under `/api/v1`. `GET /docs` serves interactive OpenAPI/Swagger docs. `GET /health` is unauthenticated and actually checks Postgres + Docker connectivity (returns `503` + `status: 'degraded'` if Postgres is unreachable; Docker being down only degrades sandbox execution, not the whole API).

On `SIGTERM`/`SIGINT` the server stops accepting new connections and closes the Postgres pool before exiting, instead of dropping in-flight requests.

## Testing

`src/__tests__/*.test.ts` (`bun test`) covers pure logic: the AST query guard, the analysis engine's rule execution, password/token hashing, and the pagination helper — including a regression test for a real bug the guard had (`node-sql-parser` sets `limit` to `{ value: [] }`, never `null`, when there's no `LIMIT` clause, so a plain truthiness check silently disabled every "...without LIMIT" rule).

**Not covered by automated tests** (validated manually against a local Postgres during this refactor, but not wired into CI):
- End-to-end auth flows (signup/login/refresh/reset/suspend) — needs a live Postgres.
- Docker sandbox execution — needs a live Docker daemon.
- Service-layer CRUD (`project.service.ts`, etc.) against a real DB.

Adding an integration suite against a disposable Postgres (e.g. via `testcontainers` or a docker-compose test profile) is a natural next step, not done here.

## Common Execution Errors

| Error | Cause | Resolution |
|---|---|---|
| `Missing required environment variable: X` | `.env` not configured | Copy `.env.example` to `.env` and fill in values |
| 401 on every request | Invalid/expired JWT, or `JWT_SECRET` changed since the token was issued | Re-authenticate |
| 403 on `/admin/*` | Account is `role: 'user'`, not `role: 'admin'` | Only the first-signup account is admin; promote via a manual `UPDATE users SET role='admin'` if needed |
| `403 CANNOT_MODIFY_SELF` on `PATCH /admin/users/:id` | Admin tried to change their own role/status | Use a second admin account |
| `403 ACCOUNT_SUSPENDED` on login | Account was suspended by an admin | Have an admin `PATCH /admin/users/:id { status: 'active' }` |
| `401 INVALID_REFRESH_TOKEN` | Token expired, already rotated/used, revoked, or account suspended/deactivated | Re-authenticate via `/auth/login` |
| `role "postgres" does not exist` / connection errors on signup | `DATABASE_URL` points at an unreachable/misconfigured Postgres | Verify the connection string and that migrations were applied |
| `Database server failed to become ready` | Docker not running or image not built | Start Docker and run `build-images.sh` |
| `400 DIALECT_DISABLED` | Dialect not in `SANDBOX_ENABLED_DIALECTS` | Add it to the env var and restart |
| Container timeout | Query too slow or sandbox resources too low | Increase `SANDBOX_TIMEOUT_MS` or `SANDBOX_MEMORY_LIMIT` |
