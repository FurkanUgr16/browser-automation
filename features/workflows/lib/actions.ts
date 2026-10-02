"use server"

import { auth } from "@clerk/nextjs/server"
import { tasks, runs } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// Type-only import keeps the task code out of the Next.js bundle.
import type { helloWorldTask } from "@/trigger/example"

import { liveblocks } from "@/lib/liveblocks"
import {
  createWorkflow,
  deleteWorkflow,
  saveWorkflowGraph,
} from "@/features/workflows/data"
import { WorkflowGraph } from "@/db/schema"
import { runWorkflowTask } from "../tasks/run-workflow"

export async function createWorkflowAction(name: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization selected")
  }

  const workflow = await createWorkflow(orgId, name)

  revalidatePath("/workflows", "layout")
  redirect(`/workflows/${workflow.id}`)
}

export async function runWorkflowAction({
  id,
  graph,
}: {
  id: string
  graph: WorkflowGraph
}) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization selected")
  }

  await saveWorkflowGraph({ orgId, id, graph })

  const handle = await tasks.trigger<typeof runWorkflowTask>(
    "run-workflow",
    {
      orgId,
      workflowId: id,
    },
    {
      tags: [`workflow:${id}`],
    }
  )

  return { runId: handle.id, publicAccessToken: handle.publicAccessToken }
}

export async function cancelWorkfow(runId: string) {
  const { orgId } = await auth()

  if (!orgId) throw new Error("No active organization")

  await runs.cancel(runId)
}

export async function deleteWorkflowAction(workflowId: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization selected")
  }

  const workflow = await deleteWorkflow(orgId, workflowId)

  if (!workflow) throw new Error("Workflow not found")

  await liveblocks.deleteRoom(workflowId)

  revalidatePath("/workflows", "layout")
  redirect("/")
}
