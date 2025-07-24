FROM node:22-alpine AS builder

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ gcc libc-dev

RUN npm install -g pnpm

WORKDIR /app

COPY package*.json pnpm-lock.yaml tsconfig.json tsup.config.ts ./

RUN pnpm install

COPY src ./src

RUN pnpm build

RUN pnpm prune --prod

FROM node:22-alpine

# Install runtime dependencies for native modules
RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/bin/sh", "-c", "NODE_ENV=production PORT=3000 CONFIG_FILE=/config/env.yml CONTEXT_FILE=/config/context.md node dist/main.js"]