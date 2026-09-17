# Pinned exact patch version — never `latest`.
FROM oven/bun:1.4.0

WORKDIR /app

COPY package.json bun.lock ./
# Not --production: drizzle-kit (devDependency) is needed by the `migrate` service in docker-compose.yml, which reuses this image.
RUN bun install --frozen-lockfile

COPY src ./src
COPY drizzle ./drizzle
COPY drizzle.config.ts tsconfig.json ./

EXPOSE 3001

# Manages sandbox engine containers via DOCKER_HOST (defaults to tcp://docker-proxy:2375 in docker-compose.yml).
# The restricted socket proxy prevents host privilege escalation or raw socket hijacking.
CMD ["bun", "run", "src/index.ts"]
