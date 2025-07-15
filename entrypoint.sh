#!/bin/sh

if [ -f /config/env.yml ]; then
  echo "[Entrypoint] Found configuration file at /config/env.yml"
  cp /config/env.yml /app/env.yml
  echo "[Entrypoint] Configuration file copied to /app/env.yml"
else
  echo "[Entrypoint] ERROR: Configuration file not found at /config/env.yml"
  echo "[Entrypoint] Please mount your env.yml file to /config/env.yml"
  echo "[Entrypoint] Example: docker run -v ./env.yml:/config/env.yml:ro ..."
  exit 1
fi

echo "[Entrypoint] Configuration file exists with $(wc -l < /app/env.yml) lines"

if [ -f /config/context.md ]; then
  echo "[Entrypoint] Found context file at /config/context.md"
  mkdir -p /app/dist/assets
  cp /config/context.md /app/dist/assets/context.md
  echo "[Entrypoint] Context file copied to /app/dist/assets/context.md"
else
  echo "[Entrypoint] No custom context file found at /config/context.md, using default"
fi

# 원래 애플리케이션 실행
echo "[Entrypoint] Starting MCP server..."
exec node dist/main.js