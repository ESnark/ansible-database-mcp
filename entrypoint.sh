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

# Check authentication configuration
if [ -n "$AUTH_TYPE" ]; then
  echo "[Entrypoint] Authentication type: $AUTH_TYPE"
  
  # Validate bearer token if AUTH_TYPE is bearer
  if [ "$AUTH_TYPE" = "bearer" ] && [ -z "$BEARER_TOKEN" ]; then
    echo "[Entrypoint] ERROR: BEARER_TOKEN is required when AUTH_TYPE=bearer"
    exit 1
  fi
  
  # Validate OAuth settings if AUTH_TYPE is oauth
  if [ "$AUTH_TYPE" = "oauth" ]; then
    if [ -z "$OAUTH_ISSUER" ] || [ -z "$OAUTH_AUDIENCE" ]; then
      echo "[Entrypoint] ERROR: OAUTH_ISSUER and OAUTH_AUDIENCE are required when AUTH_TYPE=oauth"
      exit 1
    fi
  fi
else
  echo "[Entrypoint] No authentication configured (AUTH_TYPE not set)"
fi

echo "[Entrypoint] Starting MCP server..."

exec "$@"