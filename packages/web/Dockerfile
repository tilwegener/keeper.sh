FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY packages ./packages

RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app

COPY --from=deps /app ./

ENV CI=true
RUN bun run --filter=@keeper.sh/web build

FROM oven/bun:1-slim AS runtime
WORKDIR /app

COPY --from=build /app/packages/web/.next/standalone ./
COPY --from=build /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=build /app/packages/web/public ./packages/web/public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "packages/web/server.js"]
