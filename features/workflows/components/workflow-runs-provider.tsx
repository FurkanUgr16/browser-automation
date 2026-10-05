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

/** The run object the subscription streams for this task. */
type RealtimeRun = ReturnType<
  typeof useRealtimeRunsWithTag<typeof runWorkflowTask>
>["runs"][number]

/**
 * What the console needs from a run: enough to label and order it, plus its
 * steps. The realtime run object carries much more (payload, cost, tags), none
 * of which the editor reads.
 */
export type WorkflowRun = {
  /** Trigger.dev run id, stable across updates, so it is the list key. */
  id: string
  /** Raw Trigger.dev status: "QUEUED", "EXECUTING", "COMPLETED", "FAILED", … */
  status: RealtimeRun["status"]
  /** Queued or executing — a run that finished is never live. */
  isLive: boolean
  createdAt: RealtimeRun["createdAt"]
  /**
   * One entry per node that took part, in dependency order, with its status,
   * duration, output, and error.
   */
  steps: RunStep[]
}

type WorkflowRunsValue = {
  /** Every run of the workflow, newest first. */
  runs: WorkflowRun[]
  /** Per-node statuses of the most recent run, empty before the first one. */
  steps: RunStep[]
  /** The most recent run is still queued or executing. */
  isLive: boolean
}

/**
 * What the context hands out without a provider or a run. Kept as a module
 * constant so its identity never changes and consumers can memoize on it.
 */
const noRuns: WorkflowRunsValue = { runs: [], steps: [], isLive: false }

const WorkflowRunsContext = createContext<WorkflowRunsValue>(noRuns)

/**
 * Columns neither the canvas nor the console reads. `output` and `metadata` have
 * to stay — one of them carries the step list — `createdAt` orders the runs, and
 * `status` is what decides `isLive`.
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
 * editor.
 *
 * Runs are tagged `workflow:<id>` when they are triggered, so a single tag
 * subscription covers all of them and any number of nodes and panels can read
 * the same stream through `useLatestRunSteps`/`useWorkflowRuns` instead of
 * opening one each.
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
      // carrying the previous workflow's runs into the new editor.
      id: `workflow:${workflowId}`,
      skipColumns,
    }
  )

  const value = useMemo<WorkflowRunsValue>(() => {
    // The subscription keeps runs ascending by createdAt, so reversing once here
    // both gives the console its newest-run-first list and makes the newest run
    // the first entry.
    const list = [...runs].reverse().map((run) => {
      // A finished run reports its steps through the output; a run that is still
      // going has no output yet, so the metadata the task flushes is the only
      // place they live.
      const steps =
        run.output?.steps ??
        (run.metadata?.steps as RunStep[] | undefined) ??
        []

      return {
        id: run.id,
        status: run.status,
        isLive: run.status === "QUEUED" || run.status === "EXECUTING",
        createdAt: run.createdAt,
        steps,
      } satisfies WorkflowRun
    })

    const latest = list[0]

    if (!latest) return noRuns

    return { runs: list, steps: latest.steps, isLive: latest.isLive }
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
 * The canvas' per-node view of `useWorkflowRuns` — a node only ever looks itself
 * up in the newest run.
 *
 * Reads the shared `WorkflowRunsProvider` subscription, so calling it from every
 * node costs nothing extra.
 */
export function useLatestRunSteps(): WorkflowRunsValue {
  return useContext(WorkflowRunsContext)
}

/**
 * Every run of the surrounding workflow, newest first, each with the steps it
 * ran — the console's per-run view of the same subscription.
 *
 * A run's steps come from its output once it has finished and from the metadata
 * it flushes while it is still going, so a panel can show a step's result while
 * the run that produced it is still in flight.
 */
export function useWorkflowRuns(): WorkflowRunsValue {
  return useContext(WorkflowRunsContext)
}
