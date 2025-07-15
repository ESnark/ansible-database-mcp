FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package*.json pnpm-lock.yaml tsconfig.json ./
COPY env.yml ./env.yml

RUN pnpm install

COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

RUN pnpm build

CMD ["node", "dist/main.js"]
