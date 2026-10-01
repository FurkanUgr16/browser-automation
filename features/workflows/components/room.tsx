"use client"

import { ReactNode } from "react"
import {
  LiveblocksProvider,
  RoomProvider,
  ClientSideSuspense,
} from "@liveblocks/react/suspense"

/**
 * Wraps a workflow editor in a Liveblocks room.
 *
 * Authenticates with ID tokens: before every connection, the client POSTs to
 * our auth endpoint, which identifies the Clerk user and hands back a token
 * scoped to their organization (see app/api/liveblocks/auth/route.ts). Because
 * ID-token rooms are private unless accesses are set on them, rooms must be
 * created server-side with `groupsAccesses: { [orgId]: [...] }`.
 */
export function Room({
  children,
  roomId,
}: {
  children: ReactNode
  roomId: string
}) {
  return (
    <LiveblocksProvider throttle={16} authEndpoint="/api/liveblocks/auth">
      <RoomProvider id={roomId}>
        <ClientSideSuspense fallback={<div>Loading…</div>}>
          {children}
        </ClientSideSuspense>
      </RoomProvider>
    </LiveblocksProvider>
  )
}
