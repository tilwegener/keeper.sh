FROM oven/bun:1 AS build

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY packages ./packages

RUN bun install --frozen-lockfile
RUN bun run --filter=@keeper.sh/cron build

FROM oven/bun:1-slim AS runtime
WORKDIR /app

COPY --from=build /app/packages/cron/dist ./dist

ENV NODE_ENV=production
CMD ["bun", "run", "dist/index.js"]
