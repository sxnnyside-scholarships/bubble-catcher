#!/bin/bash
# Build all Bubble Catcher sandbox Docker images
# Run from the docker/ directory

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🫧 Building Bubble Catcher sandbox images..."
echo ""

echo "📦 Building MySQL sandbox..."
docker build -f mysql/Dockerfile -t bubble-catcher-mysql:latest .

echo ""
echo "📦 Building MariaDB sandbox..."
docker build -f mariadb/Dockerfile -t bubble-catcher-mariadb:latest .

echo ""
echo "📦 Building PostgreSQL sandbox..."
docker build -f postgres/Dockerfile -t bubble-catcher-postgres:latest .

echo ""
echo "📦 Building SQLite sandbox..."
docker build -f sqlite/Dockerfile -t bubble-catcher-sqlite:latest .

echo ""
echo "📦 Building MSSQL sandbox..."
docker build -f mssql/Dockerfile -t bubble-catcher-mssql:latest .

echo ""
echo "✅ All sandbox images built successfully!"
echo ""
echo "Images:"
docker images | grep bubble-catcher
