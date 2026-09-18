# Bubble Catcher — Task Runner

# Default recipe: list available commands
default:
    @just --list

# Bootstrap all packages and toolchains
install:
    @echo "[install] Installing backend dependencies..."
    cd backend && bun install
    @echo "[install] Installing frontend dependencies..."
    cd frontend && bun install
    @echo "[install] Dependencies installed"

# Start local dev workflow (backend + frontend)
dev:
    @echo "[dev] Starting Bubble Catcher dev environment..."
    @trap 'kill 0' EXIT; (cd backend && bun run dev) & (cd frontend && bun run dev) & wait

# Produce build artifacts
build:
    @echo "[build] Building backend..."
    cd backend && bun run typecheck
    @echo "[build] Building frontend..."
    cd frontend && bun run build
    @echo "[build] Build complete"

# Run test suite across packages
test:
    @echo "[test] Running backend tests..."
    cd backend && bun test
    @echo "[test] Running frontend tests..."
    cd frontend && bun test
    @echo "[test] All tests passed"

# Run correctness/type checking
typecheck:
    @echo "[typecheck] Typechecking backend..."
    cd backend && bun run typecheck
    @echo "[typecheck] Typechecking frontend..."
    cd frontend && bun run typecheck
    @echo "[typecheck] Typecheck passed"

# Run static analysis
lint:
    @echo "[lint] Linting backend (Biome)..."
    cd backend && bun run lint
    @echo "[lint] Linting frontend (Biome)..."
    cd frontend && bun run lint
    @echo "[lint] Lint passed"

# Apply formatting
format:
    @echo "[format] Formatting backend (Biome)..."
    cd backend && bun run format
    @echo "[format] Formatting frontend (Biome)..."
    cd frontend && bun run format
    @echo "[format] Formatting complete"

# Full quality gate — format, lint, typecheck, test
check: format lint typecheck test
    @echo "[check] All quality gates passed!"

# Remove build artifacts and caches
clean:
    @echo "[clean] Cleaning build artifacts and caches..."
    rm -rf backend/dist frontend/dist
    rm -rf backend/node_modules/.cache frontend/node_modules/.cache
    @echo "[clean] Cleaned"

# Start backend only
backend:
    @echo "[backend] Starting backend (port 3001)..."
    cd backend && bun run dev

# Start frontend only
frontend:
    @echo "[frontend] Starting frontend (port 5173)..."
    cd frontend && bun run dev

# Stop dev servers
stop:
    @echo "[stop] Stopping dev servers on ports 3001 and 5173..."
    -lsof -ti:3001 | xargs kill -9 2>/dev/null
    -lsof -ti:5173 | xargs kill -9 2>/dev/null
    @echo "[stop] Dev servers stopped"

# Build all Docker sandbox images
docker-build:
    @echo "[docker] Building Docker sandbox images..."
    cd docker && bash build-images.sh
    @echo "[docker] Docker images built"

# Verify Docker status and list sandbox images
docker-check:
    @echo "[docker] Checking Docker status..."
    @docker info >/dev/null 2>&1 && echo "[docker] Docker is running" || (echo "[docker] Docker is not running" && exit 1)
    @echo ""
    @echo "[docker] Bubble Catcher sandbox images:"
    @docker images | grep bubble-catcher || echo "[docker] No sandbox images found. Run 'just docker-build' to build them."

# Package self-hosted release archive
package: build
    @echo "[package] Creating self-hosted distribution archive..."
    mkdir -p dist
    tar -czf dist/bubble-catcher-selfhosted.tar.gz \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        docker-compose.yml \
        README.md \
        docs \
        docker \
        backend \
        frontend/dist \
        frontend/Dockerfile \
        frontend/nginx.conf
    @echo "[package] Distribution package created at dist/bubble-catcher-selfhosted.tar.gz"

