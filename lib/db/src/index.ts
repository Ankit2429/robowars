import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, "../../../database-pglite");

// Initialize PGlite with persistent storage on disk
export const client = new PGlite(dbPath);
export const db = drizzle(client, { schema });

export * from "./schema";
