"use client"

import { useState } from "react"

import {
  LogsPanel,
  type StepSelection,
} from "@/features/workflows/components/logs-panel"
import { InspectorPanel } from "@/features/workflows/components/inspector-panel"
import { useWorkflowRuns } from "@/features/workflows/components/workflow-runs-provider"

/**
 * The console below the canvas: what each run did, step by step.
 *
 * It owns which step is selected — the logs list reports clicks and whatever
 * panel shows a result reads this state — so a selection is not held by the list
 * that produced it.
 */
export function ConsolePanel() {
  const { runs } = useWorkflowRuns()
  const [selected, setSelected] = useState<StepSelection | null>(null)

  // Clicking the selected step again clears it, so the console can be given back
  // to the logs alone without a separate close control.
  const select = (selection: StepSelection) =>
    setSelected((current) =>
      current?.runId === selection.runId && current.stepId === selection.stepId
        ? null
        : selection
    )

  // The selected step, found through the run it belongs to: node ids repeat
  // across runs, so the pair is what pins one result down. The run comes along
  // too — a step marked "running" only means something while its run is live.
  const selectedRun = selected
    ? runs.find((run) => run.id === selected.runId)
    : undefined
  const selectedStep =
    selected && selectedRun
      ? selectedRun.steps.find((step) => step.id === selected.stepId)
      : undefined

  return (
    <div className="flex size-full">
      <LogsPanel runs={runs} selected={selected} onSelect={select} />
      {selectedRun && selectedStep && (
        <InspectorPanel
          step={selectedStep}
          running={selectedRun.isLive && selectedStep.status === "running"}
        />
      )}
    </div>
  )
}
