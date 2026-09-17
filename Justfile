# Bubble Catcher — Task Runner

# Default recipe: list available commands
default:
    @just --list

# Bootstrap all packages and toolchains
install:
    @echo "📦 Installing backend dependencies..."
    cd backend && bun install
    @echo "📦 Installing frontend dependencies..."
    cd frontend && bun install
    @echo "✅ Dependencies installed"

# Start local dev workflow (backend + frontend)
dev:
    @echo "🚀 Starting Bubble Catcher dev environment..."
    @trap 'kill 0' EXIT; (cd backend && bun run dev) & (cd frontend && bun run dev) & wait

# Produce build artifacts
build:
    @echo "🔨 Building backend..."
    cd backend && bun run typecheck
    @echo "🔨 Building frontend..."
    cd frontend && bun run build
    @echo "✅ Build complete"

# Run test suite across packages
test:
    @echo "🧪 Running backend tests..."
    cd backend && bun test
    @echo "🧪 Running frontend tests..."
    cd frontend && bun test
    @echo "✅ All tests passed"

# Run correctness/type checking
typecheck:
    @echo "🔍 Typechecking backend..."
    cd backend && bun run typecheck
    @echo "🔍 Typechecking frontend..."
    cd frontend && bun run typecheck
    @echo "✅ Typecheck passed"

# Run static analysis
lint:
    @echo "🧹 Linting backend (Biome)..."
    cd backend && bun run lint
    @echo "🧹 Linting frontend (Biome)..."
    cd frontend && bun run lint
    @echo "✅ Lint passed"

# Apply formatting
format:
    @echo "✨ Formatting backend (Biome)..."
    cd backend && bun run format
    @echo "✨ Formatting frontend (Biome)..."
    cd frontend && bun run format
    @echo "✅ Formatting complete"

# Full quality gate — format, lint, typecheck, test
check: format lint typecheck test
    @echo "🎉 All quality gates passed!"

# Remove build artifacts and caches
clean:
    @echo "🗑️ Cleaning build artifacts and caches..."
    rm -rf backend/dist frontend/dist
    rm -rf backend/node_modules/.cache frontend/node_modules/.cache
    @echo "✅ Cleaned"

# Start backend only
backend:
    @echo "🫧 Starting backend (port 3001)..."
    cd backend && bun run dev

# Start frontend only
frontend:
    @echo "🎨 Starting frontend (port 5173)..."
    cd frontend && bun run dev

# Stop dev servers
stop:
    @echo "🛑 Stopping dev servers on ports 3001 and 5173..."
    -lsof -ti:3001 | xargs kill -9 2>/dev/null
    -lsof -ti:5173 | xargs kill -9 2>/dev/null
    @echo "✅ Dev servers stopped"

# Build all Docker sandbox images
docker-build:
    @echo "🐳 Building Docker sandbox images..."
    cd docker && bash build-images.sh
    @echo "✅ Docker images built"

# Verify Docker status and list sandbox images
docker-check:
    @echo "🐳 Checking Docker status..."
    @docker info >/dev/null 2>&1 && echo "✅ Docker is running" || (echo "❌ Docker is not running" && exit 1)
    @echo ""
    @echo "📦 Bubble Catcher sandbox images:"
    @docker images | grep bubble-catcher || echo "⚠️ No sandbox images found. Run 'just docker-build' to build them."

# Package self-hosted release archive
package: build
    @echo "📦 Creating self-hosted distribution archive..."
    mkdir -p dist
    tar -czf dist/bubble-catcher-selfhosted.tar.gz \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='dist' \
        --exclude='frontend-legacy' \
        docker-compose.yml \
        README.md \
        ARCHITECTURE.md \
        docker \
        backend \
        frontend/dist \
        frontend/Dockerfile \
        frontend/nginx.conf
    @echo "✅ Distribution package created at dist/bubble-catcher-selfhosted.tar.gz"

