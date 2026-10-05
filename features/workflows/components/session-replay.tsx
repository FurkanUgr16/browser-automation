"use client"

import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Plays back a Browserbase session recording, given the session's id.
//
// The recording is an HLS playlist served through /api/replays/[sessionId], which
// is what holds the API key; hls.js reads the playlist from there and then pulls
// the video segments straight from Browserbase's CDN.
//
// A recording is not published the moment its session closes, so this starts by
// polling the route and only builds a player once the playlist answers 200.

/** How long between readiness checks against the replay route. */
const POLL_INTERVAL_MS = 2_000

/**
 * How long to keep asking before calling it. Browserbase says nothing about why a
 * recording is missing, and a recording can sit ungenerated for a while after the
 * session ends, so this is patience rather than a deadline — passing it offers a
 * retry instead of declaring the recording gone.
 */
const GIVE_UP_AFTER_MS = 180_000

const HLS_MIME_TYPE = "application/vnd.apple.mpegurl"

/**
 * "Not there yet" answers, which the poll keeps waiting on: `404` for a recording
 * Browserbase cannot serve (still being generated, or never made), `429` for a
 * rate limit the next attempt is likely to clear.
 */
const WAIT_STATUSES = new Set([404, 429])

type SessionReplayProps = {
  /** The Browserbase session to play back — a finished run's `sessionId`. */
  sessionId: string
  className?: string
}

type Phase =
  /** Waiting on the playlist. */
  | "waiting"
  /** The playlist is served; the video is on screen. */
  | "ready"
  /** Still missing after waiting — offer a retry. */
  | "unavailable"
  /** Nothing to wait for: refused, misused, or broken in playback. */
  | "error"

export function SessionReplay({ sessionId, className }: SessionReplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [phase, setPhase] = useState<Phase>("waiting")
  const [note, setNote] = useState("")
  // Bumped by the retry button, which restarts the wait from the top.
  const [attempt, setAttempt] = useState(0)

  const src = `/api/replays/${encodeURIComponent(sessionId)}`

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const startedAt = Date.now()

    const ask = async () => {
      let response: Response
      try {
        response = await fetch(src, { cache: "no-store" })
      } catch {
        // A request that never got an answer says nothing about the recording, so
        // it is waited out like any other not-ready.
        if (!cancelled) timer = setTimeout(ask, POLL_INTERVAL_MS)
        return
      }

      if (cancelled) return

      // The playlist's own content type is the readiness test, not `response.ok`:
      // Clerk's middleware answers a request whose session lapsed with a redirect
      // to the sign-in page, which `fetch` follows into a 200 of HTML.
      const served = response.headers.get("content-type") ?? ""

      if (response.ok && served.includes(HLS_MIME_TYPE)) {
        setPhase("ready")
        return
      }

      if (response.ok) {
        setNote("Signed out — sign in again to watch the recording.")
        setPhase("error")
        return
      }

      if (WAIT_STATUSES.has(response.status)) {
        if (Date.now() - startedAt >= GIVE_UP_AFTER_MS) {
          setNote("Browserbase hasn't published this recording yet.")
          setPhase("unavailable")
          return
        }
        timer = setTimeout(ask, POLL_INTERVAL_MS)
        return
      }

      // Everything the route turns down is JSON of the same shape, so the reason
      // it said so comes along for the failure paths too.
      const body = (await response.json().catch(() => null)) as {
        error?: string
      } | null

      setNote(
        body?.error ?? `Could not load the recording (${response.status}).`
      )
      setPhase("error")
    }

    setPhase("waiting")
    setNote("")
    void ask()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [src, attempt])

  // Runs once the poll has reported the playlist, on the video the poll's ready
  // phase just put on screen.
  useEffect(() => {
    if (phase !== "ready") return

    const video = videoRef.current
    if (!video) return

    let cancelled = false
    // Set once the player exists, so unmounting mid-load still tears it down.
    let stop: (() => void) | undefined

    // Imported here rather than at the top of the file: the player is worth
    // ~150KB and only earns its weight once somebody chose to watch something.
    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return

      // hls.js is tried before the browser's own HLS, deliberately: Chromium
      // plays HLS natively and would then fetch segments off the browser's CORS
      // path instead of the library's.
      if (Hls.isSupported()) {
        const hls = new Hls()
        stop = () => hls.destroy()

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError()
            return
          }
          setNote("The recording stopped playing.")
          setPhase("error")
        })

        hls.loadSource(src)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Some players do not start on their own after the manifest parses. The
          // video is muted because that is also what lets a browser allow it.
          void video.play().catch(() => undefined)
        })
        return
      }

      if (video.canPlayType(HLS_MIME_TYPE)) {
        video.src = src
        stop = () => {
          video.removeAttribute("src")
          video.load()
        }
        return
      }

      setNote("This browser can't play the recording.")
      setPhase("error")
    })

    return () => {
      cancelled = true
      stop?.()
    }
  }, [phase, src])

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col", className)}>
      {phase === "ready" ? (
        <video
          ref={videoRef}
          className="min-h-0 w-full flex-1 bg-black object-contain"
          controls
          muted
          autoPlay
          playsInline
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-sm text-muted-foreground">
          <p className={phase === "waiting" ? "animate-pulse" : undefined}>
            {phase === "waiting"
              ? "Preparing the recording…"
              : note || "No recording to play."}
          </p>
          {phase === "unavailable" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
