FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package*.json pnpm-lock.yaml tsconfig.json tsup.config.ts ./

RUN pnpm install

COPY src ./src
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

RUN pnpm build

ENTRYPOINT ["/entrypoint.sh"]
CMD ["/bin/sh", "-c", "NODE_ENV=production PORT=3000 node dist/main.js"]