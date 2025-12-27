import type { NextConfig } from "next";

export default {
  transpilePackages: [
    "@keeper.sh/auth",
    "@keeper.sh/database",
    "@keeper.sh/env",
    "@keeper.sh/log",
    "@keeper.sh/data-schemas",
    "@keeper.sh/premium",
    "@keeper.sh/broadcast-client",
  ],
  cacheComponents: true,
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    "better-auth",
    "@polar-sh/better-auth",
    "@polar-sh/sdk",
  ],
} satisfies NextConfig;
