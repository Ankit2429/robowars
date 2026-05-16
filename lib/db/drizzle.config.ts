import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing in environment variables for drizzle-kit");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
