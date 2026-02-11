# ============================================================
# Bubble Catcher - Monorepo Build & Dev Commands
# ============================================================

.PHONY: help install backend frontend dev build clean stop lint docker-build docker-check

# Default target
.DEFAULT_GOAL := help

# Install all dependencies
install:
	@echo "📦 Installing backend dependencies..."
	@cd backend && bun install
	@echo "📦 Installing frontend dependencies..."
	@cd frontend && npm install
	@echo "✅ Dependencies installed"

# Run backend dev server
backend:
	@echo "🫧 Starting backend (port 3001)..."
	@cd backend && bun run dev

# Run frontend dev server
frontend:
	@echo "🎨 Starting frontend (port 5173)..."
	@cd frontend && npm run dev

# Run both backend and frontend concurrently
dev:
	@echo "🚀 Starting Bubble Catcher (backend + frontend)..."
	@make -j2 backend frontend

# Build production bundles
build:
	@echo "🔨 Building backend..."
	@cd backend && bun run typecheck
	@echo "🔨 Building frontend..."
	@cd frontend && npm run build
	@echo "✅ Production builds complete"

# Type-check all packages
lint:
	@echo "🔍 Type-checking backend..."
	@cd backend && bun run typecheck
	@echo "🔍 Type-checking frontend..."
	@cd frontend && npm run check
	@echo "✅ Type-checking complete"

# Stop development servers (kill ports)
stop:
	@echo "🛑 Stopping dev servers..."
	@lsof -ti:3001 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@echo "✅ Servers stopped"

# Clean node_modules and build artifacts
clean:
	@echo "🧹 Cleaning node_modules and build artifacts..."
	@rm -rf backend/node_modules
	@rm -rf frontend/node_modules
	@rm -rf frontend/.svelte-kit
	@rm -rf backend/dist
	@rm -f frontend/package-lock.json
	@rm -f bun.lockb
	@echo "✅ Cleaned"

# Build all Docker sandbox images
docker-build:
	@echo "🐳 Building Docker sandbox images..."
	@cd docker && bash build-images.sh
	@echo "✅ Docker images built"

# Check Docker daemon and list sandbox images
docker-check:
	@echo "🐳 Checking Docker status..."
	@docker info > /dev/null 2>&1 && echo "✅ Docker is running" || (echo "❌ Docker is not running" && exit 1)
	@echo ""
	@echo "📦 Bubble Catcher sandbox images:"
	@docker images | grep bubble-catcher || echo "⚠️  No sandbox images found. Run 'make docker-build' to build them."

# Display help
help:
	@echo ""
	@echo "🫧 Bubble Catcher - Available Commands"
	@echo ""
	@echo "  make install       Install backend + frontend dependencies"
	@echo "  make dev           Start backend and frontend concurrently"
	@echo "  make backend       Start backend only (port 3001)"
	@echo "  make frontend      Start frontend only (port 5173)"
	@echo "  make build         Build production bundles"
	@echo "  make lint          Type-check all packages"
	@echo "  make stop          Stop dev servers (kill ports 3001, 5173)"
	@echo "  make clean         Remove node_modules and build artifacts"
	@echo "  make docker-build  Build all Docker sandbox images"
	@echo "  make docker-check  Verify Docker is running and list images"
	@echo "  make help          Show this help message"
	@echo ""
