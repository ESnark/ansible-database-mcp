#!/bin/sh

# Check for required configuration file
if [ ! -f /config/env.yml ]; then
  echo "[Entrypoint] ERROR: Configuration file not found at /config/env.yml"
  echo "[Entrypoint] Please mount your env.yml file:"
  echo "[Entrypoint] docker run -v ./env.yml:/config/env.yml:ro ..."
  exit 1
fi

echo "[Entrypoint] Found configuration file at /config/env.yml"

# Check for optional files
if [ -f /config/context.md ]; then
  echo "[Entrypoint] Found custom context file at /config/context.md"
else
  echo "[Entrypoint] No custom context file, using default"
fi

echo "[Entrypoint] Starting MCP server..."

exec "$@"