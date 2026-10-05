import { ReactFlowProvider } from "@xyflow/react"
import { auth as triggerAuth } from "@trigger.dev/sdk"

import { WorkflowShell } from "@/features/workflows/components/workflow-shell"
import { Room } from "@/features/workflows/components/room"
import { WorkflowRunsProvider } from "@/features/workflows/components/workflow-runs-provider"
import { auth } from "@clerk/nextjs/server"
import { LiveblocksError } from "@liveblocks/node"
import { notFound } from "next/navigation"
import { getWorkflow } from "@/features/workflows/data"
import { liveblocks } from "@/lib/liveblocks"

type WorkflowPageProps = {
  params: Promise<{ id: string }>
}

/**
 * Makes sure the Liveblocks room behind a workflow exists and is scoped to its
 * organization. Rooms are private under ID-token auth, so without this nobody
 * can connect. The Clerk org ID is the group the auth endpoint stamps on every
 * token, so granting it write access gives exactly that organization's members
 * a seat in the room.
 *
 * `getOrCreateRoom` only applies these options when the room is first created;
 * switching an existing room to `upsertRoom` is needed to change accesses.
 */
async function ensureRoom(workflowId: string, orgId: string) {
  try {
    await liveblocks.getOrCreateRoom(workflowId, {
      // Private: visitors need an ID token whose accesses match.
      defaultAccesses: [],
      groupsAccesses: { [orgId]: ["*:write"] },
      // Keeps rooms listable per organization later on.
      metadata: { organizationId: orgId, workflowId },
    })
  } catch (error) {
    if (error instanceof LiveblocksError) {
      console.error(
        `[liveblocks] getOrCreateRoom("${workflowId}") failed: ${error.status} ${error.message}`
      )
    } else {
      console.error("[liveblocks] getOrCreateRoom failed", error)
    }
    // Without the room the editor cannot connect, so fail into error.tsx.
    throw error
  }
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { id } = await params
  const { orgId } = await auth()

  if (!orgId) notFound()

  const workflow = await getWorkflow(orgId, id)

  if (!workflow) notFound()

  await ensureRoom(workflow.id, orgId)

  /**
   * Credentials for the canvas' live run status. Read-only and narrowed to this
   * workflow's run tag — the same one `runWorkflowAction` stamps on every run —
   * so the token can never see another workflow's runs, let alone trigger one.
   *
   * Minted per request and good for an hour, which covers an editing session
   * without leaving a long-lived read key lying around.
   */
  const runsAccessToken = await triggerAuth.createPublicToken({
    scopes: { read: { tags: [`workflow:${workflow.id}`] } },
    expirationTime: "1h",
  })

  // One React Flow store for the whole editor: the palette in the sidebar
  // lives outside <ReactFlow> in the canvas, so both need a shared provider
  // above them for the sidebar's hooks to drive the same flow. The provider is
  // a client component (the package ships "use client"), so it can wrap
  // client children from this server component.
  return (
    <ReactFlowProvider>
      <Room roomId={workflow.id}>
        <WorkflowRunsProvider
          workflowId={workflow.id}
          publicAccessToken={runsAccessToken}
        >
          <WorkflowShell workflowId={workflow.id} />
        </WorkflowRunsProvider>
      </Room>
    </ReactFlowProvider>
  )
}
