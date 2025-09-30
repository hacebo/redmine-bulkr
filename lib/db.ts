import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable");
}

export const client = postgres(process.env.DATABASE_URL, {
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 1,
  onnotice: () => {},
});

export const db = drizzle(client, { schema });
