import { auth } from "@clerk/nextjs/server"
import { APIError } from "@browserbasehq/sdk"
import { browserbase } from "@/lib/browserbase"

// Proxies one Browserbase session recording to the console as an HLS playlist.
//
// The retrieval needs the secret API key, so it cannot happen in the browser: the
// player points at THIS route, and only the playlist passes through here. The
// segment URLs inside the body are pre-signed Browserbase CDN links, so the
// browser fetches the video itself and this route never carries a byte of it.
//
// Response contract, which is what `<SessionReplay>` polls on:
//
//   200  application/vnd.apple.mpegurl   the playlist for one recorded page
//   any other status  { ready: false, error }   why there is nothing to play yet
//
// Every non-playlist answer is that JSON, denials included, so the caller decides
// from `res.ok` alone whether it has something to feed the player.

/** Browserbase's replay endpoints take the session id as a UUID. */
const SESSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The API's own shape for a page id (`maxLength: 3`, digits only). */
const PAGE_ID = /^\d{1,3}$/

const HLS_CONTENT_TYPE = "application/vnd.apple.mpegurl"

/**
 * Nothing here is cacheable: the body is behind a sign-in and the segment URLs it
 * lists expire six hours after Browserbase mints them.
 */
const noStore = { "Cache-Control": "no-store" }

function unavailable(error: string, status: number) {
  return Response.json({ ready: false, error }, { status, headers: noStore })
}

/**
 * Turn a thrown error into the not-ready response.
 *
 * Browserbase's status is forwarded rather than flattened into a 500: a recording
 * that is not there (yet) is a `404`, and that status is precisely what tells the
 * caller to ask again later.
 */
function passThrough(err: unknown, context: string) {
  if (err instanceof APIError) {
    const status = err.status ?? 502
    if (status >= 500) {
      console.error(`[replay] ${context}`, { status, message: err.message })
    }
    return unavailable(err.message || "Browserbase did not answer.", status)
  }

  const message = err instanceof Error ? err.message : String(err)
  console.error(`[replay] ${context}`, message)
  return unavailable(message, 502)
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId, orgId } = await auth()

  if (!userId) {
    return unavailable("Not signed in.", 401)
  }

  // Recordings are org-visible data, so a personal account with no active
  // organization gets nothing — the same rule the Liveblocks endpoints apply.
  //
  // Note what this does and does not enforce: every org's runs drive browsers in
  // ONE Browserbase project, and a session id is not stored anywhere we could
  // check it against, so this proves "a member of some org" rather than "a member
  // of the org that ran it". Closing that gap means persisting the session id
  // against the run that produced it.
  if (!orgId) {
    return unavailable("No active organization.", 403)
  }

  const { sessionId } = await params

  if (!SESSION_ID.test(sessionId)) {
    return unavailable("Session id is not a Browserbase session id.", 400)
  }

  // A session records each tab as its own "page". The console plays the first
  // one, which is the tab the workflow started in; `?page=` picks another.
  const requested = new URL(request.url).searchParams.get("page")

  if (requested !== null && !PAGE_ID.test(requested)) {
    return unavailable("Page must be a number.", 400)
  }

  // Metadata first: which pages exist. An empty page list and a 404 mean the same
  // thing here — there is no recording to serve yet.
  //
  // It is also the cheap half of the poll. Browserbase rate limits the playlist
  // endpoint alone (120/min per project), so a component checking every couple of
  // seconds whether the recording landed spends that wait on this call.
  let pages: { pageId: string }[]
  try {
    pages = (await browserbase().sessions.replays.retrieve(sessionId)).pages
  } catch (err) {
    return passThrough(err, `replay metadata for ${sessionId} failed`)
  }

  const page =
    (requested !== null
      ? pages.find((candidate) => candidate.pageId === requested)
      : undefined) ?? pages[0]

  if (!page) {
    // A recording is not published the instant the session closes, so "not found"
    // is the normal answer for a run that just finished. Browserbase gives the
    // same 404 for a session that was never recorded and for one past its
    // retention window, and says nothing about which — so it is passed through
    // unchanged and how long to keep asking stays the caller's call.
    return unavailable("Replay not found.", 404)
  }

  try {
    // Resolves to the raw upstream response — the SDK hands back the unread
    // body so the playlist can be forwarded verbatim.
    const response = await browserbase().sessions.replays.retrievePage(
      sessionId,
      page.pageId
    )
    const playlist = await response.text()

    return new Response(playlist, {
      headers: { "Content-Type": HLS_CONTENT_TYPE, ...noStore },
    })
  } catch (err) {
    return passThrough(err, `replay playlist for ${sessionId} failed`)
  }
}
