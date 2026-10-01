"use server"

import { auth } from "@clerk/nextjs/server"
import { tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// Type-only import keeps the task code out of the Next.js bundle.
import type { helloWorldTask } from "@/trigger/example"

import { createWorkflow } from "@/features/workflows/data"

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
