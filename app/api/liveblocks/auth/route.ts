import { auth, currentUser } from "@clerk/nextjs/server"
import { liveblocks } from "@/lib/liveblocks"

// Liveblocks auth endpoint: mints an ID token for the signed-in Clerk user.
//
// Wire it up with `<LiveblocksProvider authEndpoint="/api/liveblocks/auth">`.
// Liveblocks POSTs here before every room connection, so the response body has
// to stay exactly as Liveblocks returned it (`{ "token": "..." }`).
//
// Access itself is enforced by Liveblocks when the room is joined, via the
// accesses set on the room server-side (`defaultAccesses` / `groupsAccesses` /
// `usersAccesses`). Per-room checks over the requested `{ room }` body belong
// here only for extra checks on top of those accesses.

/**
 * `{ error: "forbidden" }` is the payload Liveblocks reads as "do not retry",
 * so a denied user fails once instead of hammering this endpoint.
 */
function forbidden(reason: string, status = 403) {
  return Response.json({ error: "forbidden", reason }, { status })
}

export async function POST() {
  // Clerk's active user and active organization, read from the session token.
  const { userId, orgId } = await auth()

  if (!userId) {
    return forbidden("Not signed in.", 401)
  }

  // Display info other collaborators see (cursors, comments, avatar stacks).
  // Fetched after the auth check because it hits the Clerk Backend API.
  const user = await currentUser()

  // The Clerk organization doubles as the Liveblocks group: create rooms with
  // `groupsAccesses: { [orgId]: ["room:write"] }` and only members of that
  // organization can join. `organizationId` is deliberately left unset — that
  // would scope the token to a separate Liveblocks organization, while rooms
  // here live in the "default" one.
  const { status, body } = await liveblocks.identifyUser(
    {
      userId,
      // Personal accounts have no active organization: they only reach rooms
      // that grant `defaultAccesses`.
      groupIds: orgId ? [orgId] : [],
    },
    {
      userInfo: {
        name:
          user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? userId,
        avatar: user?.imageUrl,
      },
    }
  )

  if (status !== 200) {
    console.error("[liveblocks] identifyUser failed", { status, body })
  }

  // Pass Liveblocks' response through untouched — it carries the ID token.
  return new Response(body, { status })
}
