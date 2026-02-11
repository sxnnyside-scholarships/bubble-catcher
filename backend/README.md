# Bubble Catcher -- Backend

> **Sxnnyside Project** -- Educational SQL analysis and sandboxed execution platform.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Framework | [Elysia](https://elysiajs.com) v1.4.x |
| Language | TypeScript 5.5 (strict mode) |
| Database | [Supabase](https://supabase.com) PostgreSQL with RLS |
| Auth | Supabase Auth -- JWT Bearer tokens |
| SQL Parser | [node-sql-parser](https://github.com/nicolewhite/node-sql-parser) v5.3 |
| Sandbox | [Dockerode](https://github.com/apocas/dockerode) v4 -- ephemeral container per query |
| Validation | [Zod](https://zod.dev) v3.23 |

---

## Architecture Breakdown

```
src/
|-- index.ts                   Entry point -- Elysia server with CORS, error handler, routes
|-- config/
|   |-- env.ts                 Typed environment config loader (requireEnv + defaults)
|   `-- index.ts               Barrel export
|-- lib/
|   |-- errors.ts              AppError class (code, statusCode, details)
|   |-- response.ts            success() / error() structured response helpers
|   `-- supabase.ts            Supabase Admin client (service-role key) + user client factory
|-- middleware/
|   |-- auth.ts                JWT validation -> AuthContext { userId, email, accessToken }
|   |-- ensure-profile.ts      Auto-creates bubble_profiles row on first request
|   |-- error-handler.ts       Global AppError / ValidationError -> JSON response
|   `-- index.ts               Barrel export
|-- routes/
|   |-- index.ts               Barrel export
|   |-- project.routes.ts      CRUD for projects and saved queries
|   |-- user.routes.ts         Profile retrieval and preference updates
|   |-- analysis.routes.ts     SQL analysis endpoint
|   `-- execution.routes.ts    SQL execution endpoint
|-- services/
|   |-- index.ts               Barrel export
|   |-- project.service.ts     Project and saved-query persistence
|   |-- user.service.ts        Profile reads and updates
|   |-- analysis.service.ts    Orchestrates analysis engine
|   `-- execution.service.ts   Orchestrates sandbox + history recording
|-- sandbox/
|   |-- executor.interface.ts  SandboxExecutor interface contract
|   |-- docker-executor.ts     Docker-based executor (two-path architecture)
|   |-- service.ts             SandboxService (dialect -> executor mapping)
|   `-- index.ts               Barrel export
`-- analysis/
    |-- engine.ts              AnalysisEngine -- runs all rules against parsed AST
    |-- rule.interface.ts      AnalysisRule interface
    `-- rules/
        |-- index.ts           Barrel exports for all rules
        |-- select-star.rule.ts
        |-- missing-where.rule.ts
        |-- cartesian-join.rule.ts
        |-- subquery-optimization.rule.ts
        |-- unsafe-pattern.rule.ts
        |-- order-without-limit.rule.ts
        |-- leading-wildcard.rule.ts
        |-- group-by-inconsistency.rule.ts
        |-- broad-time-condition.rule.ts
        |-- join-on-non-id.rule.ts
        `-- contradictory-conditions.rule.ts

supabase/
`-- schema.sql                 Full database schema (bubble_* tables, RLS policies)
```

---

## Middleware

### Error Handler (`error-handler.ts`)

Registered as the first plugin on the Elysia app. Catches `AppError` instances and Elysia `ValidationError`s, converting them to structured JSON responses. Uses `.as('global')` to propagate the `onError` hook to every route in the application.

### Auth Middleware (`auth.ts`)

Extracts the `Authorization: Bearer <token>` header, validates JWT structure (three non-empty dot-separated segments), and calls `supabaseAdmin.auth.getUser(token)` to verify the token against Supabase. On success, it derives an `AuthContext` object with `userId`, `email`, and `accessToken` into the request context.

Uses `.as('plugin')` so the `derive` hook propagates to the parent plugin that calls `.use(authMiddleware)`.

### Ensure Profile Middleware (`ensure-profile.ts`)

Depends on `authMiddleware` (Elysia deduplicates by plugin name). After authentication, it queries `bubble_profiles` for the user. If no row exists, it inserts one with default values (`plan: 'free'`, `preferred_theme: 'colorful'`, `preferred_locale: 'en'`). Duplicate-key errors (`23505`) from concurrent requests are silently ignored.

Uses `.as('plugin')` for the same propagation reason.

### Elysia Plugin Hook Propagation

Elysia >= 1.1 changed plugin lifecycle hooks to be local-scoped by default. A `derive()` defined inside a plugin only applies to routes within that plugin instance. It does not propagate to routes in the parent that calls `.use(plugin)`.

To fix this:

| Method | Scope |
|---|---|
| `.as('plugin')` | Propagates hooks one level up (to the immediate parent) |
| `.as('global')` | Propagates hooks to the root app and all routes |
| `{ as: 'scoped' }` on individual hooks | Per-hook one-level propagation |

Without `.as('plugin')` on `authMiddleware`, all routes outside the middleware plugin receive `auth` as `undefined` and return 500 errors instead of 401.

---

## Auth Flow

1. Frontend sends `Authorization: Bearer <jwt>` with every API request.
2. `authMiddleware` validates the token via `supabaseAdmin.auth.getUser(token)`.
3. `ensureProfileMiddleware` provisions a `bubble_profiles` row if missing.
4. Route handlers receive `auth: AuthContext` containing `userId`, `email`, and `accessToken`.
5. Services use `createUserClient(accessToken)` to make Supabase queries scoped to the user's RLS policies.

---

## ensureProfile Flow

```
Request arrives with valid JWT
  |
  v
Query bubble_profiles WHERE id = auth.userId
  |
  |-- Row exists -> continue (no-op)
  |
  `-- Row missing -> INSERT defaults
       |
       |-- Success -> log, continue
       `-- Error 23505 (duplicate key) -> another request created it, continue
            |
            `-- Other error -> throw 500
```

---

## Rule Engine

The analysis engine parses SQL into an AST using `node-sql-parser` and runs each registered rule against the tree. Rules are stateless functions that return an array of `AnalysisIssue` objects.

### Registered Rules

| Rule ID | Name | Severity | Detects |
|---|---|---|---|
| `select-star` | SELECT * | warning | Unbounded column selection |
| `missing-where` | Missing WHERE | error | `UPDATE`/`DELETE` without `WHERE` clause |
| `cartesian-join` | Cartesian Join | warning | Implicit cross joins in `FROM` |
| `subquery-optimization` | Subquery Optimization | info | `IN`/`EXISTS` subqueries convertible to `JOIN` |
| `unsafe-pattern` | Unsafe Pattern | error | `DROP`, `TRUNCATE`, `GRANT`, multi-statement |
| `order-without-limit` | ORDER BY without LIMIT | info | Full table sort without row limit |
| `leading-wildcard` | Leading Wildcard | warning | `LIKE '%...'` preventing index usage |
| `group-by-inconsistency` | GROUP BY Inconsistency | warning | Non-aggregated columns missing from `GROUP BY` |
| `broad-time-condition` | Broad Time Condition | warning | `DELETE`/`UPDATE` with broad date/time ranges |
| `join-on-non-id` | JOIN on Non-Key | info | `JOIN` conditions where neither column is a key |
| `contradictory-conditions` | Contradictory AND | error | `x = 1 AND x = 2` (always false) |

### How to Extend: Writing a New Rule

1. Create a file in `src/analysis/rules/` following the naming convention `<rule-name>.rule.ts`.

2. Implement the `AnalysisRule` interface:

```typescript
import type { AnalysisIssue } from '@shared/types';
import type { AnalysisRule } from '../rule.interface';
import type { AST } from 'node-sql-parser';

export class MyNewRule implements AnalysisRule {
  readonly id = 'my-new-rule';
  readonly name = 'My New Rule';
  readonly description = 'Detects something specific in SQL queries';

  analyze(ast: AST, originalQuery: string): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];
    // Walk the AST and push issues
    return issues;
  }
}
```

3. Export the class from `src/analysis/rules/index.ts`.

4. Register the rule in the `AnalysisEngine` constructor in `src/analysis/engine.ts`.

Each `AnalysisIssue` must include:

| Field | Type | Purpose |
|---|---|---|
| `ruleId` | `string` | Matches the rule's `id` |
| `severity` | `'error' \| 'warning' \| 'info'` | Issue severity |
| `message` | `string` | Short human-readable description |
| `explanation` | `string` | Detailed explanation for the learner |
| `suggestedRewrite` | `string \| null` | Optional SQL rewrite suggestion |
| `line` | `number \| null` | Source line (if available) |
| `column` | `number \| null` | Source column (if available) |

---

## Sandbox Lifecycle

### Two-Path Architecture

The executor uses two distinct paths depending on whether the dialect requires a running database server.

**Non-server path (SQLite):**

1. Create container with `Cmd` that pipes seed SQL and user query into `sqlite3 :memory:`.
2. Start container.
3. Race: wait for container exit vs timeout.
4. Parse stdout as TSV with headers.
5. Destroy container in `finally` block.

**Server-based path (PostgreSQL, MySQL, MariaDB, MSSQL):**

1. Create container with default entrypoint (no `Cmd` override). The database server starts and applies seed data automatically.
2. Start container.
3. Poll readiness using a dialect-specific health check command via `container.exec()`.
4. Once ready, execute the user query via a second `container.exec()` call.
5. Parse stdout (TSV for most dialects, custom parser for MSSQL).
6. Destroy container in `finally` block.

### Dialect Configuration

| Dialect | Image | Server-Based | Health Check | Readiness Timeout |
|---|---|---|---|---|
| SQLite | `bubble-catcher-sqlite:latest` | No | N/A | N/A |
| PostgreSQL | `bubble-catcher-postgres:latest` | Yes | `pg_isready -h 127.0.0.1` | 30s |
| MySQL | `bubble-catcher-mysql:latest` | Yes | `mysqladmin ping -h 127.0.0.1` | 60s |
| MariaDB | `bubble-catcher-mariadb:latest` | Yes | `mariadb-admin ping -h 127.0.0.1` | 60s |
| MSSQL | `bubble-catcher-mssql:latest` | Yes | `sqlcmd -Q "SELECT 1"` | 45s |

### Container Security

All containers are created with:

- `NetworkMode: 'none'` -- no network access
- `NetworkDisabled: true` -- double enforcement
- `CapDrop: ['ALL']` -- all Linux capabilities dropped (non-server)
- `SecurityOpt: ['no-new-privileges']` -- prevent privilege escalation
- Memory and CPU limits enforced via cgroups
- Timeout enforced via `Promise.race` with a timer

### How to Add a New Dialect

1. Create a Dockerfile in `docker/<dialect>/` that installs the database engine and copies seed data.
2. Create a seed SQL file in `docker/seed/<dialect>-seed.sql`.
3. Add a `DialectConfig` entry to the `DIALECT_CONFIGS` record in `docker-executor.ts`, specifying:
   - `image`: Docker image name
   - `env`: Environment variables
   - `serverBased`: Whether the dialect needs a running server
   - `buildCommand`: Function that builds the CLI command for query execution
   - `healthCheck`: Command array for readiness polling (server-based only)
   - `readinessTimeoutSec` and `readinessPollMs`: Polling parameters
   - `parseOutput`: Output parser function
4. Add the dialect to `SUPPORTED_DIALECTS` in `shared/types/dialect.ts`.
5. Add the dialect to `DIALECT_MAP` in `analysis/engine.ts`.
6. Build the image: `docker build -f docker/<dialect>/Dockerfile -t bubble-catcher-<dialect>:latest docker/`.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `SUPABASE_URL` | Yes | -- | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | -- | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | -- | Supabase service-role key (admin operations) |
| `PORT` | No | `3001` | HTTP server port |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin |
| `SANDBOX_TIMEOUT_MS` | No | `10000` | Maximum query execution time in milliseconds |
| `SANDBOX_MEMORY_LIMIT` | No | `128m` | Container memory limit (Docker format) |
| `SANDBOX_CPU_LIMIT` | No | `0.5` | Container CPU share (fractional cores) |
| `NODE_ENV` | No | `development` | `development` or `production` |

---

## Docker Requirements

- Docker Desktop or Docker Engine must be running.
- All five sandbox images must be built before executing queries:

```bash
cd docker && bash build-images.sh
```

- Images are architecture-aware. MSSQL runs under Rosetta emulation on Apple Silicon and may have slower startup times.
- The Docker socket must be accessible to the Bun process (typically `/var/run/docker.sock`).

---

## Database Tables

All application tables use the `bubble_` prefix. The schema is defined in `supabase/schema.sql`.

| Table | Purpose |
|---|---|
| `bubble_profiles` | User plan, preferred theme, preferred locale |
| `bubble_projects` | SQL projects owned by a user |
| `bubble_saved_queries` | Named SQL queries within a project |
| `bubble_execution_history` | Execution results log |

Free-plan users are limited to 3 projects, enforced by a database trigger (`enforce_bubble_project_limit`).

---

## Common Execution Errors

| Error | Cause | Resolution |
|---|---|---|
| `Missing required environment variable: X` | `.env` not configured | Copy `.env.example` to `.env` and fill in values |
| 401 on every request | Invalid or expired JWT | Re-authenticate on the frontend |
| 500 on all protected routes | Auth middleware hooks not propagating | Verify `authMiddleware` ends with `.as('plugin')` |
| 500 on profile endpoints | `bubble_profiles` table missing | Run `supabase/schema.sql` against your database |
| `Database server failed to become ready` | Docker not running or image not built | Start Docker and run `build-images.sh` |
| Container timeout | Query too slow or sandbox resources too low | Increase `SANDBOX_TIMEOUT_MS` or `SANDBOX_MEMORY_LIMIT` |
| `unable to open database file` (SQLite) | Executor not using `:memory:` path | Ensure `docker-executor.ts` uses the non-server path for SQLite |

---

## Development Workflow

```bash
# Install dependencies
bun install

# Copy env template
cp .env.example .env

# Start with file watching
bun run dev

# Type-check only (no emit)
bun run typecheck

# Production start
bun run start
```

The API server starts at `http://localhost:3001`. All routes are grouped under `/api/v1`. The `/health` endpoint is unauthenticated and returns service status.
