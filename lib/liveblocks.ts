import { Liveblocks } from "@liveblocks/node"

/**
 * Server-only Liveblocks client, shared by everything that talks to Liveblocks
 * from the back end: minting ID tokens, creating rooms and setting their
 * accesses, triggering notifications, reading/mutating storage.
 *
 * Authenticated with the secret key (sk_...), so never import this from client
 * components — only from route handlers, server actions, and Trigger.dev tasks.
 */
export const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
})
