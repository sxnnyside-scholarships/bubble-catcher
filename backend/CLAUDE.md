# Backend — Elysia + Bun API

## Architecture
- **Framework**: Elysia (TypeScript web framework running natively on Bun)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Self-hosted JWT + Argon2id password hashing + refresh tokens
- **Sandbox Execution**: Dockerode executing isolated container sandboxes for SQL dialects

## Commands
- `bun run dev`: Start development server with hot-reload
- `bun run typecheck`: Run `tsc --noEmit`
- `bun run lint`: Run Biome linter (`biome check src`)
- `bun run lint:fix`: Auto-fix lint and formatting issues (`biome check --write src`)
- `bun run format`: Run Biome formatter (`biome format --write src`)
- `bun test`: Run test suite (`bun test`)
- `bun run db:setup`: Run migrations and apply database triggers

## Key Guidelines
- All routes reside in `src/routes/` and are registered in `src/routes/index.ts`.
- Responses use standardized wrappers from `src/lib/response.ts` (`success()`, `error()`).
- Error handling flows through `src/middleware/error-handler.ts` using typed `AppError`.
