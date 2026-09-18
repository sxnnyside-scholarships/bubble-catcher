# Stage 1: Build static assets
FROM oven/bun:1.4.0 AS builder

WORKDIR /app

# Install dependencies with frozen lockfile
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile

# Copy root config and shared modules
COPY tsconfig.base.json /tsconfig.base.json
COPY shared /shared
COPY shared ./shared

# Copy frontend source code
COPY frontend ./

# VITE_API_URL defaults to /api/v1 so reverse proxy handles routing seamlessly
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

RUN bun run build

# Stage 2: Serve with high-performance Alpine Nginx
FROM nginx:1.27-alpine AS runner

# Copy custom Nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
