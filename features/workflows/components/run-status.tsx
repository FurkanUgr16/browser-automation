"use client"

import {
  useRealtimeRun,
  type UseRealtimeSingleRunOptions,
} from "@trigger.dev/react-hooks"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import type { helloWorldTask } from "@/trigger/example"

/**
 * The inspector renders the status, the failure message and the returned message,
 * so everything else is skipped to keep the stream small. `output` and `error`
 * are deliberately left in.
 */
const skipColumns: UseRealtimeSingleRunOptions["skipColumns"] = [
  "payload",
  "payloadType",
  "outputType",
  "metadata",
  "runTags",
  "startedAt",
  "queuedAt",
  "delayUntil",
  "expiredAt",
  "number",
  "isTest",
  "ttl",
  "usageDurationMs",
  "costInCents",
  "baseCostInCents",
]

type StatusMeta = {
  label: string
  variant: React.ComponentProps<typeof Badge>["variant"]
  /** Still working, so the badge carries a spinner. */
  pending?: boolean
}

/** Keyed by `RunStatus`; anything unmapped falls back to the raw status. */
const statusMeta: Record<string, StatusMeta> = {
  WAITING_FOR_DEPLOY: {
    label: "Waiting for deploy",
    variant: "secondary",
    pending: true,
  },
  QUEUED: { label: "Queued", variant: "secondary", pending: true },
  DELAYED: { label: "Delayed", variant: "secondary", pending: true },
  EXECUTING: { label: "Running", variant: "secondary", pending: true },
  REATTEMPTING: { label: "Retrying", variant: "secondary", pending: true },
  FROZEN: { label: "Paused", variant: "secondary", pending: true },
  COMPLETED: { label: "Completed", variant: "default" },
  CANCELED: { label: "Canceled", variant: "outline" },
  EXPIRED: { label: "Expired", variant: "outline" },
  FAILED: { label: "Failed", variant: "destructive" },
  CRASHED: { label: "Crashed", variant: "destructive" },
  INTERRUPTED: { label: "Interrupted", variant: "destructive" },
  SYSTEM_FAILURE: { label: "System failure", variant: "destructive" },
  TIMED_OUT: { label: "Timed out", variant: "destructive" },
}

const fallbackStatus = (status: string): StatusMeta => ({
  label: status,
  variant: "outline",
})

function formatDuration(durationMs: number) {
  const seconds = durationMs / 1000
  return seconds < 60
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
}

type RunStatusProps = {
  runId: string
  publicAccessToken: string
}

/**
 * Live feedback for a single run of the workflow: its status while it runs, then
 * either the message the task returned or the reason it failed.
 *
 * The subscription is authenticated with the run-scoped token handed back by
 * `runWorkflowAction` and keyed by the run id, so re-running swaps in a fresh
 * subscription rather than showing the previous run's state.
 */
export function RunStatus({ runId, publicAccessToken }: RunStatusProps) {
  const { run, error } = useRealtimeRun<typeof helloWorldTask>(runId, {
    accessToken: publicAccessToken,
    id: runId,
    skipColumns,
    onComplete: (completed, err) => {
      const reason = err?.message ?? completed.error?.message
      if (reason) {
        toast.error(reason)
        return
      }
      toast.success("Workflow finished")
    },
  })

  if (error) {
    return (
      <p role="alert" className="text-xs text-destructive">
        {error.message}
      </p>
    )
  }

  if (!run) {
    return <p className="text-xs text-muted-foreground">Connecting to run…</p>
  }

  const { label, variant, pending } =
    statusMeta[run.status] ?? fallbackStatus(run.status)

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-2">
      <div className="flex items-center justify-between gap-2">
        <Badge variant={variant}>
          {pending && <Spinner />}
          {label}
        </Badge>
        {run.finishedAt && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDuration(run.durationMs)}
          </span>
        )}
      </div>

      {run.error?.message && (
        <p className="text-xs break-words text-destructive">
          {run.error.message}
        </p>
      )}

      {run.output?.message && (
        <p className="text-xs break-words text-muted-foreground">
          {run.output.message}
        </p>
      )}

      <p className="truncate font-mono text-[0.65rem] text-muted-foreground/70">
        {run.id}
      </p>
    </div>
  )
}
