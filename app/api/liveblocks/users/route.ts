import { auth, clerkClient } from "@clerk/nextjs/server"

// User-info resolver backing `resolveUsers` on `<LiveblocksProvider>`.
//
// The client calls this endpoint with a batch of user IDs (e.g. comment
// authors, mention targets, cursor owners) and expects display info back in
// the SAME ORDER, one entry per ID, `null` for IDs it couldn't resolve —
// that contract is what `resolveUsers` in @liveblocks/react is documented to
// require.
//
// Entries mirror the `UserMeta["info"]` shape declared in liveblocks.config.ts
// and the userInfo minted in /api/liveblocks/auth, so avatars and names render
// consistently across presence, comments, and notifications.

/** Clerk's `user_id[]` filter accepts at most 100 IDs per call. */
const CLERK_USER_ID_BATCH = 100

type UserInfo = { name: string; avatar?: string }

export async function POST(request: Request) {
  // Read the session claims from the token only — no Backend API call yet.
  const { userId, orgId } = await auth()

  if (!userId) {
    return Response.json({ error: "Not signed in." }, { status: 401 })
  }

  // User info is org-scoped data (collaborators in the same workspace), so an
  // active organization is required. Personal accounts get nothing.
  if (!orgId) {
    return Response.json({ error: "No active organization." }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const userIds = (body as { userIds?: unknown } | null)?.userIds

  if (
    !Array.isArray(userIds) ||
    userIds.length === 0 ||
    !userIds.every((id): id is string => typeof id === "string")
  ) {
    return Response.json(
      { error: "Expected { userIds: string[] } with at least one ID." },
      { status: 400 },
    )
  }

  // Resolve each distinct ID once, then map back onto the original order.
  const uniqueIds = [...new Set(userIds)]
  const usersById = new Map<string, UserInfo>()

  for (let i = 0; i < uniqueIds.length; i += CLERK_USER_ID_BATCH) {
    const batch = uniqueIds.slice(i, i + CLERK_USER_ID_BATCH)

    // One Backend API call per batch. `organizationId` scopes the filter to
    // members of the caller's organization, so IDs belonging to outsiders come
    // back empty and end up as `null` — the endpoint never leaks user info
    // across orgs. `limit` matters: Clerk's default page size is 10.
    const { data } = await (await clerkClient()).users.getUserList({
      userId: batch,
      organizationId: [orgId],
      limit: batch.length,
    })

    for (const user of data) {
      usersById.set(user.id, {
        // Same fallback chain as the Liveblocks auth endpoint.
        name:
          user.fullName ??
          user.primaryEmailAddress?.emailAddress ??
          user.id,
        avatar: user.imageUrl,
      })
    }
  }

  // Same length and order as the incoming `userIds`; `null` where the ID is
  // unknown or belongs to another organization.
  return Response.json(userIds.map((id) => usersById.get(id) ?? null))
}
