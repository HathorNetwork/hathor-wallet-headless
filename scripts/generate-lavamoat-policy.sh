#!/usr/bin/env bash
#
# Generates the LavaMoat policy from production dependencies.
#
# The policy must be generated against production node_modules (not dev) because
# npm resolves transitive dependencies differently when devDependencies are
# installed. Additionally, config.js is loaded dynamically at runtime, so we use
# a shim entrypoint that statically requires it so lavamoat discovers its
# dependency tree (yargs, etc.).
#
# Requirements: Docker
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "==> Installing dependencies (including dev for build)..."
npm ci --silent

echo "==> Building with config.js.docker as config source..."
cp config.js.docker src/config.js
npm run build --silent
rm src/config.js

echo "==> Building Docker deps stage (production node_modules)..."
docker build --target deps -t hathor-headless-deps . -q

echo "==> Generating LavaMoat policy inside container..."
SHIM=$(mktemp)
cat > "$SHIM" << 'EOF'
require("./dist/index.js");
require("./dist/config.js");
EOF

docker run --rm \
  -v "$PROJECT_DIR/lavamoat:/usr/src/app/lavamoat" \
  -v "$PROJECT_DIR/dist:/usr/src/app/dist" \
  -v "$SHIM:/usr/src/app/lavamoat-entry.js" \
  hathor-headless-deps \
  sh -c "./node_modules/.bin/lavamoat lavamoat-entry.js --autopolicy" 2>&1

rm -f "$SHIM"

echo "==> Done. Policy written to lavamoat/node/policy.json"
