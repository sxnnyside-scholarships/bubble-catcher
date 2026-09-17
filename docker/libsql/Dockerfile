FROM oven/bun:1.4.0

WORKDIR /app
RUN bun add @libsql/client

COPY seed/libsql-seed.sql /app/seed.sql
COPY libsql/run.ts /app/run.ts

ENTRYPOINT ["bun", "run", "/app/run.ts"]
