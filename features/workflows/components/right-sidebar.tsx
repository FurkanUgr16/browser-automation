"use client"

import { useState, useTransition } from "react"
import {
  LoaderCircle as LoaderCircleIcon,
  Play as PlayIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { RunStatus } from "@/features/workflows/components/run-status"
import { runWorkflowAction } from "@/features/workflows/lib/actions"

/**
 * The run started from this panel, plus the token that lets the browser subscribe
 * to it. Kept in memory only — the token is short-lived and run-scoped.
 */
type ActiveRun = {
  runId: string
  publicAccessToken: string
}

type RightSidebarProps = {
  workflowId: string
}

/**
 * Right-hand sidebar of the workflow editor: the inspector.
 *
 * Holds the controls that act on the workflow as a whole: running it, and the
 * live feedback that run reports back.
 */
export function RightSidebar({ workflowId }: RightSidebarProps) {
  const [run, setRun] = useState<ActiveRun | null>(null)
  const [isPending, startTransition] = useTransition()

  const runWorkflow = () => {
    startTransition(async () => {
      try {
        // The action only queues the run, it does not wait for it, so this
        // resolves as soon as the run exists. `RunStatus` takes it from there.
        const { runId, publicAccessToken } = await runWorkflowAction(workflowId)
        setRun({ runId, publicAccessToken })
        toast.success("Workflow started")
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to run workflow"
        )
      }
    })
  }

  return (
    <div className="flex size-full flex-col gap-2 p-2">
      <Button onClick={runWorkflow} disabled={isPending}>
        {isPending ? (
          <LoaderCircleIcon className="animate-spin" />
        ) : (
          <PlayIcon />
        )}
        <span>{isPending ? "Starting" : "Run"}</span>
      </Button>

      {run && (
        <RunStatus
          runId={run.runId}
          publicAccessToken={run.publicAccessToken}
        />
      )}
    </div>
  )
}
