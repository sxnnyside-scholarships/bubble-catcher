# Pinned exact patch version — never `latest`.
FROM oven/bun:1.4.0

WORKDIR /app

# Copy dependency manifests and install with frozen lockfile
COPY backend/package.json backend/bun.lock ./
RUN bun install --frozen-lockfile

# Copy root config and shared modules
COPY tsconfig.base.json /tsconfig.base.json
COPY shared /shared
COPY shared ./shared

# Copy backend source, migrations, and config
COPY backend/src ./src
COPY backend/drizzle ./drizzle
COPY backend/drizzle.config.ts backend/tsconfig.json ./

EXPOSE 3001

# Manages sandbox engine containers via DOCKER_HOST (defaults to tcp://docker-proxy:2375 in docker-compose.yml).
# The restricted socket proxy prevents host privilege escalation or raw socket hijacking.
CMD ["bun", "run", "src/index.ts"]
