#!/bin/bash
# Usage: ./build-images.sh [dialect ...]   (default: build all; see docker/README.md)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VERSION_TAG="1.0.0"
ALL_DIALECTS=(mysql mariadb postgres sqlite libsql mssql)

if [ "$#" -eq 0 ]; then
  DIALECTS=("${ALL_DIALECTS[@]}")
else
  DIALECTS=("$@")
fi

echo "🫧 Building Bubble Catcher sandbox images: ${DIALECTS[*]}"
echo ""

for dialect in "${DIALECTS[@]}"; do
  valid=false
  for d in "${ALL_DIALECTS[@]}"; do
    [ "$d" = "$dialect" ] && valid=true && break
  done
  if [ "$valid" = false ]; then
    echo "❌ Unknown dialect: $dialect (expected one of: ${ALL_DIALECTS[*]})" >&2
    exit 1
  fi

  echo "📦 Building $dialect sandbox..."
  docker build -f "$dialect/Dockerfile" \
    -t "bubble-catcher-$dialect:latest" \
    -t "bubble-catcher-$dialect:$VERSION_TAG" \
    .
  echo ""
done

echo "✅ Done. Set SANDBOX_IMAGE_TAG=$VERSION_TAG in backend/.env to run these (it's already the default)."
echo ""
echo "Images:"
docker images | grep bubble-catcher
