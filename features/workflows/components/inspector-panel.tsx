"use client"

import type { RunStep } from "@/features/workflows/tasks/run-workflow"

/**
 * What the selected step produced: its output as JSON, the error that stopped it,
 * or a word on why there is neither.
 *
 * Rendered beside the logs only while a step is selected, so the console spends
 * its whole width on the run list until there is something to read.
 */
export function InspectorPanel({
  step,
  running,
}: {
  step: RunStep
  /** The step's work is in flight right now — its run is still live. */
  running: boolean
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-border">
      {/* Same header as the logs, so the two read as one console. */}
      <h2 className="shrink-0 border-b border-border px-3 py-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        Output
      </h2>

      <div className="min-h-0 flex-1 overflow-auto">
        {step.status === "failed" ? (
          <p className="m-2 rounded-lg bg-muted p-3 font-mono text-xs break-words whitespace-pre-wrap text-destructive">
            {step.error ?? "Failed without a message."}
          </p>
        ) : step.output !== undefined ? (
          <pre className="m-2 w-fit rounded-lg bg-muted p-3 font-mono text-xs">
            {JSON.stringify(step.output, null, 2)}
          </pre>
        ) : (
          <p className="p-3 text-sm text-muted-foreground">
            {note(step, running)}
          </p>
        )}
      </div>
    </section>
  )
}

// A step with nothing to show says why — which is not the same as having
// produced nothing.
function note(step: RunStep, running: boolean): string {
  if (running) return "Still running…"
  // Left marked "running" by a run that was canceled or crashed instead of
  // finishing, so nothing more is ever coming for it.
  if (step.status === "running") return "Stopped before finishing."
  if (step.status === "pending") return "Hasn't run yet."
  return "No output."
}
