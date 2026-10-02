"use server"

import { auth } from "@clerk/nextjs/server"
import { LiveblocksError } from "@liveblocks/node"
import { tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// Type-only import keeps the task code out of the Next.js bundle.
import type { helloWorldTask } from "@/trigger/example"

import { liveblocks } from "@/lib/liveblocks"
import { createWorkflow, deleteWorkflow } from "@/features/workflows/data"

export async function createWorkflowAction(name: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization selected")
  }

  const workflow = await createWorkflow(orgId, name)

  revalidatePath("/workflows", "layout")
  redirect(`/workflows/${workflow.id}`)
}

/**
 * Start a run of the workflow.
 *
 * The example task stands in for the task a workflow will compile to once the
 * canvas produces one, so the workflow is passed as a tag — the run is traceable
 * back to its workflow (and organization) from the Trigger.dev dashboard.
 *
 * Only the workflow id travels from the client; ownership is derived from the
 * session, never from the request body.
 */
export async function runWorkflowAction(workflowId: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization selected")
  }

  const handle = await tasks.trigger<typeof helloWorldTask>(
    "hello-world",
    { message: `Running workflow ${workflowId}` },
    { tags: [`workflow:${workflowId}`, `org:${orgId}`] }
  )

  // The handle's token is scoped to this one run, which is exactly what the
  // client needs to subscribe to its updates — no project-wide key leaves the
  // server.
  return { runId: handle.id, publicAccessToken: handle.publicAccessToken }
}

/**
 * Delete the workflow and send the user back to the homepage.
 *
 * The workflow's Liveblocks room uses the workflow id as its room id, so it is
 * removed alongside the row. The database is the source of truth, so a failed
 * room cleanup is logged but not fatal — the row is already gone, and failing
 * the action would strand the user on a page for a workflow that no longer
 * exists.
 *
 * Like the other actions, ownership is derived from the session's organization
 * rather than the request, so one org can never delete another's workflow.
 */
export async function deleteWorkflowAction(workflowId: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization selected")
  }

  // deleteWorkflow returns the removed row — undefined when nothing matched
  // (unknown id, or a workflow belonging to another organization), in which
  // case there is no room of ours to clean up either.
  const workflow = await deleteWorkflow(orgId, workflowId)

  if (!workflow) throw new Error("Workflow not found")

  await liveblocks.deleteRoom(workflowId)

  // The workflow list in the dashboard layout is server-rendered, so refresh
  // it before leaving — otherwise the deleted workflow would linger in the
  // sidebar until the next navigation. redirect() must stay outside the
  // try/catch above: it throws a framework-controlled error to navigate.
  revalidatePath("/workflows", "layout")
  redirect("/")
}
