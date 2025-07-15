#!/bin/sh

# 마운트된 설정 파일이 있는지 확인
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

# 설정 파일 내용 확인 (디버깅용 - 민감한 정보가 있다면 제거 가능)
echo "[Entrypoint] Configuration file exists with $(wc -l < /app/env.yml) lines"

# 원래 애플리케이션 실행
echo "[Entrypoint] Starting MCP server..."
exec node dist/main.js