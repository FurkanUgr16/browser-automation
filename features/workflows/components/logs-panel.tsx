"use client"

import prettyMs from "pretty-ms"

import { NodeIcon } from "@/features/workflows/components/right-sidebar"
import type { WorkflowRun } from "@/features/workflows/components/workflow-runs-provider"

// Type-only, so this panel stays clear of the task's server code.
import type { RunStep } from "@/features/workflows/tasks/run-workflow"
import { cn } from "@/lib/utils"

/**
 * The step a reader picked: which run it came from, and which step of that run.
 * The run is part of it because the same node appears in every run, so a node id
 * alone would not say which run's result is on screen.
 */
export type StepSelection = { runId: string; stepId: string }

type LogsPanelProps = {
  /** Every run of the workflow, newest first. */
  runs: WorkflowRun[]
  selected: StepSelection | null
  onSelect: (selection: StepSelection) => void
}

const panelHeader =
  "shrink-0 px-3 py-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground"

/**
 * The runs of a workflow, newest first, each with the steps it ran.
 *
 * Reads as a console rather than a log feed: a step shows what it was, how long
 * it took, and where it got to, and clicking one hands the selection up so the
 * output of that exact step can be shown beside it.
 */
export function LogsPanel({ runs, selected, onSelect }: LogsPanelProps) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <h2 className={`${panelHeader} border-b border-border`}>Logs</h2>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {runs.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            Nothing has run yet.
          </p>
        ) : (
          runs.map((run) => (
            <RunGroup
              key={run.id}
              run={run}
              selected={selected}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </section>
  )
}

// One run: when it started, then its steps in the order they ran.
function RunGroup({
  run,
  selected,
  onSelect,
}: {
  run: WorkflowRun
  selected: StepSelection | null
  onSelect: (selection: StepSelection) => void
}) {
  return (
    <div className="flex flex-col gap-0.5 p-2">
      <div className="px-2 pt-1 pb-1 text-[0.65rem] font-medium tracking-wider text-muted-foreground/70 tabular-nums">
        {run.createdAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}
      </div>

      {run.steps.map((step) => (
        <StepRow
          key={step.id}
          run={run}
          step={step}
          selected={selected?.runId === run.id && selected.stepId === step.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

// One step of a run: its node's icon and title, how long it took, and its state
// — spinning while it runs, red once it failed, faded while it never got to run.
function StepRow({
  run,
  step,
  selected,
  onSelect,
}: {
  run: WorkflowRun
  step: RunStep
  selected: boolean
  onSelect: (selection: StepSelection) => void
}) {
  // A run that was killed rather than finishing cleanly leaves its last node
  // marked "running", so the spinner only turns while the run itself is live.
  const running = run.isLive && step.status === "running"
  const failed = step.status === "failed"
  const idle = step.status === "pending"

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect({ runId: run.id, stepId: step.id })}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        "hover:bg-accent/50",
        selected && "bg-accent",
        failed && "text-destructive",
        idle && "text-muted-foreground"
      )}
    >
      <NodeIcon
        type={step.type}
        running={running}
        className={idle ? "opacity-50" : undefined}
      />
      <span className="min-w-0 flex-1 truncate text-left">{step.title}</span>
      {step.durationMs !== undefined && (
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {prettyMs(step.durationMs)}
        </span>
      )}
    </button>
  )
}
