# Architecture Deep Dive

This document provides a comprehensive technical overview of Bubble Catcher's internal architecture, focusing on the most complex subsystems: authentication propagation, sandbox execution, and static analysis.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Authentication & Authorization Flow](#authentication--authorization-flow)
3. [Sandbox Execution Architecture](#sandbox-execution-architecture)
4. [Analysis Engine Internals](#analysis-engine-internals)
5. [Database Schema](#database-schema)
6. [Request Lifecycle](#request-lifecycle)
7. [Error Handling Strategy](#error-handling-strategy)

---

## High-Level Architecture

Bubble Catcher is a **monorepo** with three primary packages:

```
bubble-catcher/
├── backend/         TypeScript backend (Bun + Elysia)
├── frontend/        SvelteKit frontend (Svelte 5 + TailwindCSS 4)
├── shared/          Shared TypeScript types
└── docker/          5 SQL dialect sandbox images
```

**Communication Flow:**

```
User → Frontend (SvelteKit SSR/CSR)
         ↓
      API Request (JWT in Authorization header)
         ↓
      Backend (Elysia REST API)
         ↓
   ┌────────────────┴──────────────┐
   │                                │
   ↓                                ↓
Analysis Engine              Sandbox Executor
(AST-based static rules)     (Docker ephemeral containers)
   │                                │
   └────────────────┬───────────────┘
                    ↓
              Supabase (Auth + DB)
```

**Tech Stack Summary:**

| Layer         | Technology                                 |
|---------------|--------------------------------------------|
| Backend       | Bun 1.1.38, Elysia 1.4.x, Dockerode, node-sql-parser |
| Frontend      | SvelteKit 2.5, Svelte 5 (runes), TailwindCSS 4, Monaco Editor |
| Shared        | TypeScript 5.x, shared type definitions    |
| Database      | Supabase (PostgreSQL) with RLS policies    |
| Sandbox       | Docker 24+, ephemeral containers (5 dialects) |
| Auth          | Supabase Auth (JWT validation)             |

---

## Authentication & Authorization Flow

### Overview

Bubble Catcher uses **Supabase Auth** with JWT bearer tokens. The backend validates JWTs and enforces Row-Level Security (RLS) via Supabase's PostgreSQL policies.

### Critical Middleware Chain

All protected routes pass through two middleware functions:

1. **`authMiddleware`** (JWT validation)
2. **`ensureProfileMiddleware`** (user profile enforcement)

### The Elysia Plugin Hook Propagation Issue

**Problem:**

In Elysia >= 1.1, middleware registered with `.use()` does NOT propagate lifecycle hooks (e.g., `onBeforeHandle`) to route handlers registered AFTER the middleware, unless explicitly marked with `.as('plugin')` or `.as('global')`.

**Symptom:**

```typescript
// ❌ BROKEN (Elysia >= 1.1)
app.use(authMiddleware);
app.use(ensureProfileMiddleware);
app.use(projectRoutes);  // Routes inside projectRoutes do NOT see ensureProfileMiddleware hooks
```

Routes registered after `.use(ensureProfileMiddleware)` continue without waiting for the profile resolution promise, leading to **race conditions** and **undefined user data**.

**Solution:**

Mark middleware as `.as('plugin')` to propagate hooks correctly:

```typescript
// ✅ CORRECT (backend/src/middleware/ensure-profile.ts)
export const ensureProfileMiddleware = new Elysia({ name: 'ensure-profile' })
  .derive(async ({ user, error }) => {
    // ... profile logic
  })
  .as('plugin');  // <--- Critical for hook propagation
```

### Authentication Flow Diagram

```
┌──────────────┐
│ Client sends │
│ request with │
│ JWT token    │
└──────┬───────┘
       │
       ↓
┌──────────────────┐
│ authMiddleware   │  Validates JWT, extracts claims
│ (JWT validation) │  Sets `user` in context
└──────┬───────────┘
       │
       ↓
┌─────────────────────────┐
│ ensureProfileMiddleware │  Queries Supabase for user profile
│ (.as('plugin'))         │  Sets `profile` in context
└──────┬──────────────────┘
       │
       ↓
┌──────────────┐
│ Route handler│  Access `user` and `profile` safely
└──────────────┘
```

### Profile Resolution Logic

**File:** `backend/src/middleware/ensure-profile.ts`

**Key Steps:**

1. Extract `user` from JWT (set by `authMiddleware`)
2. Query Supabase `profiles` table with RLS policy enforcement
3. If no profile exists, return `404 Profile not found`
4. Attach `profile` to request context
5. Continue to route handler

**RLS Policy Enforcement:**

The backend uses the **service role key** for Supabase queries, but manually enforces RLS by filtering queries with `eq('user_id', user.id)`. This ensures users can only access their own data.

---

## Sandbox Execution Architecture

### Overview

The sandbox executes user SQL queries inside **ephemeral Docker containers** with strict security constraints:

- **No network access** (isolated network)
- **Read-only filesystem** (except `/tmp`)
- **Memory limit:** 512 MB
- **CPU limit:** 1 core
- **Execution timeout:** 30 seconds
- **Automatic cleanup** after execution

### Two-Path Architecture

**File:** `backend/src/sandbox/docker-executor.ts`

Bubble Catcher uses **two distinct execution paths** based on SQL dialect:

#### **Path 1: Non-Server Dialects (SQLite)**

SQLite runs as a **single command** without a persistent server:

```typescript
// Backend spawns container
docker run --rm \
  -v /tmp/user-db.sqlite:/app/db.sqlite:ro \
  bubble-catcher-sqlite \
  sqlite3 /app/db.sqlite < query.sql

// Query executes
// Container exits
// Results returned
```

**Key Characteristics:**

- Single `docker run` invocation
- Database file volume-mounted
- No server startup overhead
- Immediate execution

#### **Path 2: Server-Based Dialects (PostgreSQL, MySQL, MariaDB, MSSQL)**

These dialects require a **running database server** inside the container:

```typescript
// Backend spawns container
docker run --rm \
  --entrypoint bash \
  bubble-catcher-postgres \
  -c "start-server.sh && run-query.sh"

// 1. Server starts (postgres, mysqld, etc.)
// 2. Wait for server readiness
// 3. Execute query via client (psql, mysql, etc.)
// 4. Container exits
// Results returned
```

**Key Characteristics:**

- Multi-step execution (start server → wait → query)
- Dockerfile must define `CMD` to start server
- Backend uses `Cmd: ['bash', '-c', '...']` to override and run custom script
- Requires readiness checks (e.g., `pg_isready`, `mysqladmin ping`)

### Docker Executor Implementation

**File:** `backend/src/sandbox/docker-executor.ts`

**Key Methods:**

- `executeQuery(dialect, query, timeout)` — Main entry point
- `_executeNonServerBased(dialect, query, timeout)` — SQLite path
- `_executeServerBased(dialect, query, timeout)` — PostgreSQL/MySQL/MariaDB/MSSQL path
- `_getDialectConfig(dialect)` — Returns image name, command, flags
- `_waitForOutput(stream, timeout)` — Collects stdout/stderr with timeout

**Dialect Configuration Table:**

| Dialect    | Image                     | Client Command | Flags                          |
|------------|---------------------------|----------------|--------------------------------|
| SQLite     | bubble-catcher-sqlite     | `sqlite3`      | `-bail`, `-batch`              |
| PostgreSQL | bubble-catcher-postgres   | `psql`         | `-v ON_ERROR_STOP=1`, `-t`, `-A` |
| MySQL      | bubble-catcher-mysql      | `mysql`        | `--batch`, `--raw`             |
| MariaDB    | bubble-catcher-mariadb    | `mariadb`      | `--batch`, `--raw`             |
| MSSQL      | bubble-catcher-mssql      | `sqlcmd`       | `-b`, `-h -1`                  |

### Server Startup Scripts

Each server-based Dockerfile includes a startup script:

**Example: PostgreSQL**

```dockerfile
# docker/postgres/Dockerfile
FROM postgres:15-alpine
ENV POSTGRES_PASSWORD=test
CMD ["postgres"]  # Default command to start server
```

**Backend override:**

```typescript
Cmd: ['bash', '-c', 'postgres & sleep 2 && psql -d postgres < /tmp/query.sql']
```

This ensures:

1. `postgres` starts in the background (`&`)
2. Wait for server readiness (`sleep 2` or `pg_isready` loop)
3. Execute query via `psql`
4. Container exits when script completes

### Security Constraints

**Container runtime options:**

```typescript
HostConfig: {
  NetworkMode: 'none',       // No network access
  Memory: 512 * 1024 * 1024, // 512 MB RAM
  NanoCpus: 1e9,             // 1 CPU core
  ReadonlyRootfs: true,      // Read-only filesystem
  Tmpfs: { '/tmp': 'rw' }    // Writable /tmp only
}
```

**Additional constraints:**

- No volume mounts from host (except for SQLite database file, read-only)
- No privileged mode
- No host port bindings
- Automatic cleanup (`AutoRemove: true`)

### Error Handling

**Common errors:**

| Error                        | Cause                                    | Solution                              |
|------------------------------|------------------------------------------|---------------------------------------|
| `Container not found`        | Docker daemon not running                | Start Docker Desktop                  |
| `Image not found`            | Sandbox images not built                 | Run `make docker-build`               |
| `Query timeout exceeded`     | Long-running query                       | Optimize query or increase timeout    |
| `Server failed to start`     | Missing `CMD` in Dockerfile              | Ensure Dockerfile has `CMD`           |
| `Permission denied`          | Incorrect file permissions in image      | Fix `chmod +x` in Dockerfile          |

---

## Analysis Engine Internals

### Overview

The analysis engine performs **static analysis** on SQL queries by parsing them into an **Abstract Syntax Tree (AST)** and running rule-based checks.

**File:** `backend/src/analysis/engine.ts`

### Architecture

```
SQL Query (string)
    ↓
node-sql-parser (Parser.parse)
    ↓
AST (Abstract Syntax Tree)
    ↓
Rule 1: Check AST for anti-pattern A
Rule 2: Check AST for anti-pattern B
Rule N: Check AST for anti-pattern N
    ↓
Findings[] (severity, message, line, column)
```

### Rule Interface

**File:** `backend/src/analysis/rule.interface.ts`

```typescript
export interface AnalysisRule {
  id: string;         // Unique rule ID (e.g., 'select-star')
  name: string;       // Human-readable name
  analyze(ast: AST): Finding[];  // Main analysis function
}

export interface Finding {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}
```

### Rule Registration

**File:** `backend/src/analysis/rules/index.ts`

All rules are registered in a single array:

```typescript
import { SelectStarRule } from './select-star.rule';
import { MissingWhereRule } from './missing-where.rule';
// ... 11 rules total

export const ALL_RULES: AnalysisRule[] = [
  new SelectStarRule(),
  new MissingWhereRule(),
  // ...
];
```

**CRITICAL:** Any new rule MUST be added to this array, or it will not run.

### AST Structure Example

**Query:** `SELECT * FROM users WHERE id = 1`

**AST (simplified):**

```json
{
  "type": "select",
  "columns": [{ "expr": { "type": "column_ref", "column": "*" } }],
  "from": [{ "table": "users" }],
  "where": {
    "type": "binary_expr",
    "operator": "=",
    "left": { "type": "column_ref", "column": "id" },
    "right": { "type": "number", "value": 1 }
  }
}
```

### Rule Example: `MissingWhereRule`

**File:** `backend/src/analysis/rules/missing-where.rule.ts`

**Logic:**

1. Check if AST is a `SELECT`, `UPDATE`, or `DELETE` statement
2. Check if `where` clause is missing
3. If missing, return a `warning` finding

**Code:**

```typescript
export class MissingWhereRule implements AnalysisRule {
  id = 'missing-where';
  name = 'Missing WHERE Clause';

  analyze(ast: AST): Finding[] {
    const findings: Finding[] = [];
    const stmts = Array.isArray(ast) ? ast : [ast];

    for (const stmt of stmts) {
      if (['select', 'update', 'delete'].includes(stmt.type) && !stmt.where) {
        findings.push({
          ruleId: this.id,
          severity: 'warning',
          message: `${stmt.type.toUpperCase()} without WHERE may affect all rows`,
          suggestion: 'Add a WHERE clause to limit scope'
        });
      }
    }

    return findings;
  }
}
```

### Current Rule Set (11 Rules)

| Rule ID                       | Severity | Description                                       |
|-------------------------------|----------|---------------------------------------------------|
| `select-star`                 | warning  | Detects `SELECT *` usage                          |
| `missing-where`               | warning  | Detects UPDATE/DELETE without WHERE               |
| `cartesian-join`              | error    | Detects joins without ON clause                   |
| `subquery-optimization`       | info     | Suggests EXISTS over IN for subqueries            |
| `unsafe-pattern`              | error    | Detects dangerous patterns (DROP, TRUNCATE, etc.) |
| `order-without-limit`         | warning  | ORDER BY without LIMIT can be slow                |
| `leading-wildcard`            | warning  | LIKE with leading % cannot use indexes            |
| `group-by-inconsistency`      | error    | SELECT columns not in GROUP BY                    |
| `broad-time-condition`        | warning  | Time ranges > 1 year may be slow                  |
| `join-on-non-id`              | warning  | JOIN on non-ID columns may be inefficient         |
| `contradictory-conditions`    | warning  | Detects impossible WHERE conditions               |

### Adding a New Rule

See `CONTRIBUTING.md` for a full example with code. Summary:

1. Create `backend/src/analysis/rules/your-rule.rule.ts`
2. Implement `AnalysisRule` interface
3. Register in `backend/src/analysis/rules/index.ts`
4. Test with sample queries

---

## Database Schema

### Overview

Bubble Catcher uses **Supabase** (PostgreSQL) with the following schema:

**File:** `backend/supabase/schema.sql`

### Tables

#### `profiles`

Stores user profile data (one-to-one with Supabase Auth users).

| Column       | Type      | Description                        |
|--------------|-----------|------------------------------------|
| `id`         | `uuid`    | Primary key                        |
| `user_id`    | `uuid`    | Foreign key to `auth.users`        |
| `created_at` | `timestamp` | Profile creation timestamp       |

**RLS Policy:** Users can only access their own profile (`user_id = auth.uid()`).

#### `projects`

Stores SQL projects (queries, analysis results, execution results).

| Column           | Type        | Description                              |
|------------------|-------------|------------------------------------------|
| `id`             | `uuid`      | Primary key                              |
| `user_id`        | `uuid`      | Foreign key to `profiles.user_id`        |
| `name`           | `text`      | Project name                             |
| `sql_query`      | `text`      | User's SQL query                         |
| `dialect`        | `text`      | SQL dialect (sqlite, postgres, etc.)     |
| `analysis_result`| `jsonb`     | Static analysis findings                 |
| `execution_result`| `jsonb`    | Sandbox execution output                 |
| `created_at`     | `timestamp` | Project creation timestamp               |
| `updated_at`     | `timestamp` | Last update timestamp                    |

**RLS Policy:** Users can only access their own projects (`user_id = auth.uid()`).

---

## Request Lifecycle

### Example: Analyze SQL Query

**User Action:** User clicks "Analyze" in the frontend.

**Frontend → Backend:**

```http
POST /api/analysis/analyze
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "query": "SELECT * FROM users",
  "dialect": "postgres"
}
```

**Backend Processing:**

1. **Request hits Elysia server** (`backend/src/index.ts`)
2. **authMiddleware** validates JWT, extracts `user` claims
3. **ensureProfileMiddleware** fetches user profile from Supabase
4. **Route handler** (`backend/src/routes/analysis.routes.ts`) receives request
5. **Analysis service** (`backend/src/services/analysis.service.ts`) calls analysis engine
6. **Analysis engine** (`backend/src/analysis/engine.ts`) parses query into AST
7. **All 11 rules** run against AST, collect findings
8. **Response** sent back to frontend

**Backend → Frontend:**

```json
{
  "success": true,
  "data": {
    "findings": [
      {
        "ruleId": "select-star",
        "severity": "warning",
        "message": "SELECT * may impact performance",
        "suggestion": "Specify explicit columns"
      }
    ]
  }
}
```

**Frontend Rendering:**

- `AnalysisPanel.svelte` displays findings grouped by severity
- Color-coded badges (red=error, yellow=warning, blue=info)

---

## Error Handling Strategy

### Backend Error Handling

**File:** `backend/src/middleware/error-handler.ts`

**Strategy:**

- All errors pass through a **global error handler**
- Custom error classes extend base `AppError` class
- HTTP status codes mapped to error types

**Error Classes:**

| Class                   | Status | Description                        |
|-------------------------|--------|------------------------------------|
| `ValidationError`       | 400    | Invalid request data               |
| `UnauthorizedError`     | 401    | Missing or invalid JWT             |
| `ForbiddenError`        | 403    | Insufficient permissions           |
| `NotFoundError`         | 404    | Resource not found                 |
| `InternalServerError`   | 500    | Unexpected server error            |

**Error Response Format:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid SQL syntax",
    "details": { ... }
  }
}
```

### Frontend Error Handling

**File:** `frontend/src/lib/api.ts`

**Strategy:**

- All API calls go through a centralized `api` client
- Errors are caught and transformed into user-friendly messages
- Toast notifications for user feedback

**Defensive Patterns (Preventing Race Conditions):**

1. **Session loaded gate:** Wait for `$page.data.session` before making API calls
2. **Load-once flags:** Prevent duplicate profile fetches
3. **Retry cooldown:** Exponential backoff for failed requests
4. **`.catch()` on effects:** Always handle promise rejections in `$effect()` blocks

---

## Conclusion

This document covers the most complex internal systems in Bubble Catcher. For day-to-day development tasks, refer to:

- **README.md** — High-level project overview
- **backend/README.md** — Backend architecture and development
- **frontend/README.md** — Frontend architecture and development
- **CONTRIBUTING.md** — How to contribute, write rules, test sandbox

For questions or clarifications, contact: support.sxnnyside@sxnnysideproject.com
