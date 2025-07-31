FROM node:22-alpine AS base

RUN apk add --no-cache python3 make g++ gcc libc-dev

RUN npm install -g pnpm

# Multi-platform build stage
FROM base AS builder

WORKDIR /app

COPY package*.json pnpm-lock.yaml tsconfig.json tsup.config.ts ./

RUN pnpm install --frozen-lockfile

COPY src ./src

RUN pnpm approve-builds @swc/core esbuild lz4

RUN pnpm build

RUN pnpm prune --prod

# Runtime stage
FROM base

# Install runtime dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files first
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm approve-builds lz4

RUN pnpm install --prod --frozen-lockfile && \
    pnpm rebuild

COPY --from=builder /app/dist ./dist

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/bin/sh", "-c", "NODE_ENV=production PORT=3000 CONFIG_FILE=/config/env.yml CONTEXT_FILE=/config/context.md node dist/main.js"]