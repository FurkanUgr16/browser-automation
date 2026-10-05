"use client"

import { createContext, useContext, useMemo, type ReactNode } from "react"
import {
  useRealtimeRunsWithTag,
  type UseRealtimeRunsWithTagOptions,
} from "@trigger.dev/react-hooks"

// Type-only: keeps the task's server code (Stagehand, Drizzle) out of the client
// bundle while still typing `run.output` against what the task really returns.
import type {
  RunStep,
  runWorkflowTask,
} from "@/features/workflows/tasks/run-workflow"

type WorkflowRunsValue = {
  /** Per-node statuses of the most recent run, empty before the first one. */
  steps: RunStep[]
  /** The run is still queued or executing. */
  isLive: boolean
}

/**
 * What the context hands out without a provider or a run. Kept as a module
 * constant so its identity never changes and consumers can memoize on it.
 */
const noRuns: WorkflowRunsValue = { steps: [], isLive: false }

const WorkflowRunsContext = createContext<WorkflowRunsValue>(noRuns)

/**
 * Columns the canvas never reads. `output` and `metadata` have to stay — one of
 * them carries the step list — and `status` is what decides `isLive`.
 */
const skipColumns: UseRealtimeRunsWithTagOptions["skipColumns"] = [
  "payload",
  "payloadType",
  "runTags",
  "startedAt",
  "queuedAt",
  "delayUntil",
  "expiredAt",
  "completedAt",
  "number",
  "isTest",
  "ttl",
  "usageDurationMs",
  "costInCents",
  "baseCostInCents",
]

type WorkflowRunsProviderProps = {
  workflowId: string
  /** Public access token scoped to read the workflow's run tag. */
  publicAccessToken: string
  children: ReactNode
}

/**
 * One realtime subscription to every run of a workflow, shared by the whole
 * canvas.
 *
 * Runs are tagged `workflow:<id>` when they are triggered, so a single tag
 * subscription covers all of them and any number of nodes can read the same
 * stream through `useLatestRunSteps` instead of opening one each.
 */
export function WorkflowRunsProvider({
  workflowId,
  publicAccessToken,
  children,
}: WorkflowRunsProviderProps) {
  const { runs } = useRealtimeRunsWithTag<typeof runWorkflowTask>(
    `workflow:${workflowId}`,
    {
      accessToken: publicAccessToken,
      // Re-subscribes from scratch when switching workflows instead of
      // carrying the previous workflow's runs into the new canvas.
      id: `workflow:${workflowId}`,
      skipColumns,
    }
  )

  const value = useMemo<WorkflowRunsValue>(() => {
    // The subscription keeps runs ascending by createdAt, so the newest is last.
    const latest = runs.at(-1)

    if (!latest) return noRuns

    // A finished run reports its steps through the output; a run that is still
    // going has no output yet, so the metadata the task flushes is the only
    // place they live.
    const steps =
      latest.output?.steps ??
      (latest.metadata?.steps as RunStep[] | undefined) ??
      []

    return {
      steps,
      isLive: latest.status === "QUEUED" || latest.status === "EXECUTING",
    }
  }, [runs])

  return (
    <WorkflowRunsContext.Provider value={value}>
      {children}
    </WorkflowRunsContext.Provider>
  )
}

/**
 * Status of every node in the most recent run of the surrounding workflow, plus
 * whether that run is still going.
 *
 * Reads the shared `WorkflowRunsProvider` subscription, so calling it from every
 * node costs nothing extra.
 */
export function useLatestRunSteps(): WorkflowRunsValue {
  return useContext(WorkflowRunsContext)
}
