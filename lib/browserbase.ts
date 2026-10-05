import { Browserbase } from "@browserbasehq/sdk"

// Server-only client for the Browserbase platform API — the read side of a
// session: its replay (`sessions.replays`), its logs, its live-view URLs, its
// contexts and extensions.
//
// Authenticated with the secret API key (`X-BB-API-Key`), so never import this
// from a client component — only from route handlers, server actions, and
// Trigger.dev tasks. Everything the browser needs comes back from here already
// scoped to what a viewer is allowed to see.
//
// Not to be confused with the `browserbase` export of `@browserbasehq/stagehand`,
// which LAUNCHES a browser (`browserbase.launch()`); the run task imports that
// one. This client is how a finished session is read back — the same session id
// goes in one end as a launch and the other as a replay.

let client: Browserbase | undefined

/**
 * The shared client, built on first use.
 *
 * Built lazily rather than at module scope so the missing-key error lands on the
 * request that needed the key instead of on whatever first imports this file —
 * route modules get loaded during `next build`, where env vars may not be set.
 */
export function browserbase(): Browserbase {
  if (!client) {
    // The SDK throws its own "BROWSERBASE_API_KEY is missing" error when handed
    // an empty key, which is a clearer message than anything said here would be.
    client = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY })
  }
  return client
}
