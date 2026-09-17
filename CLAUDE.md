# Bubble Catcher — Engineering Guidelines

## Repository Overview & Topology

Bubble Catcher is a Non-Monolithic (workspace/monorepo) educational SQL analysis and sandboxed execution platform.

### Structure
- `backend/`: API server built with **Elysia** + **Bun**, Drizzle ORM (PostgreSQL), Dockerode sandboxing, self-hosted JWT authentication.
- `frontend/`: Single-page application built with **Vue 3** + **Vite** + **Pinia** + **Tailwind CSS v4** + **Vue I18n**.
- `shared/`: Shared TypeScript domain models, API schemas, and AST analysis rule interfaces (`@shared/*`).
- `docker/`: Dockerfiles and build scripts for sandbox database engines (PostgreSQL, MySQL, MSSQL, libSQL).

---

## Tooling & Command Surface

The canonical task runner is `just`. All common tasks are driven from the repository root:

| Command | Purpose |
|---|---|
| `just install` | Install dependencies across all packages (Bun) |
| `just dev` | Start backend (:3001) and frontend (:5173) concurrently |
| `just build` | Compile backend and build production frontend bundle |
| `just test` | Run test suites across backend and frontend (`bun test`) |
| `just typecheck` | Run TypeScript strict compiler checks (`tsc` / `vue-tsc`) |
| `just lint` | Run Biome static analysis across all packages |
| `just format` | Run Biome automatic formatter |
| `just check` | Full quality gate (`format` → `lint` → `typecheck` → `test`) |
| `just clean` | Remove build artifacts and temporary caches |
| `just backend` | Start backend server only |
| `just frontend` | Start frontend dev server only |
| `just stop` | Terminate running dev servers on ports 3001 & 5173 |
| `just docker-build` | Build Docker sandbox images |
| `just docker-check` | Verify Docker daemon and list sandbox images |

---

## Stack Profile & Standards

- **Runtime & Package Manager**: `bun` (>= 1.4.0)
- **Type Checker**: TypeScript in strict mode (`strict: true`), no implicit any
- **Linter & Formatter**: **Biome** (`biome check`, `biome format`)
  - 2-space indentation, 120 print width
  - Single quotes, trailing commas, semicolons required
- **Testing**: `bun test` for unit/integration testing
- **CI/CD**: GitHub Actions workflows in `.github/workflows/` (`ci.yml` running `just check`, `release.yml` for publishing)

---

## Coding Conventions

1. **Self-Hosted Architecture**:
   - Authentication is fully self-hosted (Argon2id password hashing + JWT + refresh tokens).
   - No external third-party auth vendors.
2. **Analysis Rules**:
   - Every rule in `backend/src/analysis/rules/` implements `AnalysisRule`.
   - Never throw on unexpected AST nodes; return issues gracefully.
3. **Database & Migrations**:
   - Schema defined in `backend/src/db/schema.ts` using Drizzle ORM.
   - Use `bun run db:migrate` and `bun run db:triggers` for database evolution.
4. **Imports**:
   - Cross-package shared types imported via `@shared/types`.
   - Frontend path alias `@/*` maps to `frontend/src/*`.
   - Biome handles import ordering automatically.

---

## Quality Gate Checklist

Before opening a PR or committing:
1. `just check` must pass cleanly (zero errors across formatting, linting, typecheck, and tests).
2. New features or critical logic must include unit tests.
3. Conventional commit format (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
