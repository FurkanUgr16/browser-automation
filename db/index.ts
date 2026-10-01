import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"

// Pooled connection for application queries (HTTP transport,
// works in Node, serverless, and edge runtimes)
const sql = neon(process.env.DATABASE_URL!)

export const db = drizzle({ client: sql, schema, casing: "snake_case" })

export { schema }
