# `docker/` — sandbox image sources (not docker-compose services)

Builds the images that `backend/src/sandbox/docker-executor.ts` spins up as ephemeral, one-shot containers — one per query execution, removed right after. Not referenced by the root `docker-compose.yml` (that only runs Postgres + the backend API — see `../backend/README.md`).

## Enabling/disabling a dialect

Set `SANDBOX_ENABLED_DIALECTS` in `backend/.env` and restart the backend — no changes needed here. Build the image for a dialect before enabling it; otherwise execution fails with `IMAGE_NOT_FOUND`.

## Building images

```bash
cd docker
./build-images.sh                     # all dialects
./build-images.sh sqlite postgres     # only what you need
```

Each image is tagged `:latest` and a pinned version (`:1.0.0`). The backend runs the pinned tag by default (`SANDBOX_IMAGE_TAG` in `backend/.env`) — rebuilding here doesn't affect a running instance until you bump that env var.

## Approximate image weight

| Dialect | Base image | Rough size |
|---|---|---|
| `sqlite` | `alpine:3.19` | ~10MB |
| `libsql` | `oven/bun:1.4.0` + `@libsql/client` | ~120MB |
| `postgresql` | `postgres:16-alpine` | ~240MB |
| `mariadb` | `mariadb:11` | ~400MB |
| `mysql` | `mysql:8.0` | ~600MB |
| `mssql` | `mcr.microsoft.com/mssql/server:2022-latest` | ~1.5GB+, needs ≥2GB RAM — skip on small VPS |

## Files

- `<dialect>/Dockerfile` — installs the engine, copies a seed file.
- `seed/<dialect>-seed.sql` — sample schema+data loaded into every fresh container.
- `mssql/entrypoint.sh` — starts the server, waits for readiness, applies the seed (others do this via `docker-entrypoint-initdb.d`).
- `libsql/run.ts` — the libSQL image has no native CLI equivalent to `sqlite3`, so this script (run via Bun, the image's ENTRYPOINT) opens an in-memory `@libsql/client` db, loads the seed, executes the query from `/tmp/query.sql`, and prints TSV.
- `build-images.sh` — builds and tags the images.

## Known caveats

- `mssql`'s base tag `2022-latest` is Microsoft's own moving tag, not pinned to an exact build — pin it via `--build-arg MSSQL_BASE_TAG=...` (see `mssql/Dockerfile`) before production use.
- `libsql/run.ts` was written and typechecked against the documented `@libsql/client` local-mode API but not build-tested against a live Docker daemon in the session that added it — verify the image builds and runs before relying on it.
