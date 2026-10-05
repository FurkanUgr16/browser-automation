"use client"

import { useState } from "react"

import {
  LogsPanel,
  type ConsoleSelection,
} from "@/features/workflows/components/logs-panel"
import {
  InspectorPanel,
  type InspectorTarget,
} from "@/features/workflows/components/inspector-panel"
import {
  useWorkflowRuns,
  type WorkflowRun,
} from "@/features/workflows/components/workflow-runs-provider"

/**
 * The console below the canvas: what each run did, step by step, and the
 * recording of any run that has one.
 *
 * It owns which row is selected — the logs list reports clicks and the output pane
 * reads this state — so a selection is not held by the list that produced it, and
 * a step and a run's replay cannot both be on screen.
 */
export function ConsolePanel() {
  const { runs } = useWorkflowRuns()
  const [selected, setSelected] = useState<ConsoleSelection | null>(null)

  // Clicking the row already selected clears it, so the console can be given back
  // to the logs alone without a separate close control.
  const select = (selection: ConsoleSelection) =>
    setSelected((current) =>
      isSameSelection(current, selection) ? null : selection
    )

  // The selected run, then what its row is worth showing. The step is looked up
  // through the run because node ids repeat across runs, so only the pair pins one
  // result down — and a run's replay needs the run itself, not any of its steps.
  const selectedRun = selected
    ? runs.find((run) => run.id === selected.runId)
    : undefined
  const target = outputFor(selected, selectedRun)

  return (
    <div className="flex size-full">
      <LogsPanel runs={runs} selected={selected} onSelect={select} />
      {target && <InspectorPanel target={target} />}
    </div>
  )
}

// Whether a click landed on the row already picked, which is what makes it a
// second click on the same thing rather than a move to another one.
function isSameSelection(
  current: ConsoleSelection | null,
  next: ConsoleSelection
): boolean {
  if (!current || current.runId !== next.runId) return false
  if (current.kind === "replay" && next.kind === "replay") return true
  if (current.kind === "step" && next.kind === "step") {
    return current.stepId === next.stepId
  }
  return false
}

// Resolve a selection into something the output pane can render. Nothing at all is
// the answer when the run it pointed at is no longer in the list, or when the step
// it named is gone from it.
function outputFor(
  selection: ConsoleSelection | null,
  run: WorkflowRun | undefined
): InspectorTarget | null {
  if (!selection || !run) return null

  if (selection.kind === "replay") {
    // No session id means no recording — a run that never opened a browser, or one
    // that has not finished yet. Its row is not in the list either, so this is the
    // same rule seen from the other side.
    return run.sessionId ? { kind: "replay", sessionId: run.sessionId } : null
  }

  const step = run.steps.find((candidate) => candidate.id === selection.stepId)
  if (!step) return null

  return {
    kind: "step",
    step,
    running: run.isLive && step.status === "running",
  }
}
