import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  driver: "pglite",
  dbCredentials: {
    url: "../../../database-pglite",
  },
});
