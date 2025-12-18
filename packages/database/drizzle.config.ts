import env from "@keeper.sh/env/database";
import { defineConfig } from "drizzle-kit";
import { join } from "node:path";

export default defineConfig({
  out: "./drizzle",
  schema: join(__dirname, "src", "database", "schema.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
