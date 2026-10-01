import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

// Drizzle Kit runs outside Next.js, so load .env.local explicitly
config({ path: ".env.local" })

if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("DATABASE_URL_UNPOOLED is not set in .env.local")
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  // Migrations must use the direct (non-pooled) connection
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED,
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
})
