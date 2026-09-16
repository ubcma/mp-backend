FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# dev: used by docker-compose (target: dev) — hot reload via tsx
FROM base AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
COPY . .
EXPOSE 8080
ENTRYPOINT ["docker-entrypoint.sh"]

# builder: compiles TypeScript
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# prod: used by Railway — mirrors exactly what Nixpacks did (pnpm install && pnpm build, then node dist/src/server.js)
FROM base AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
EXPOSE 8080
CMD ["pnpm", "start"]
