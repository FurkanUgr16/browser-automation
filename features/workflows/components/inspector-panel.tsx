"use client"

import { SessionReplay } from "@/features/workflows/components/session-replay"

// Type-only, so this panel stays clear of the task's server code.
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

/**
 * What the output pane is showing: one step's result, or a run's recording.
 *
 * Mirrors `ConsoleSelection`, which is the row the reader picked — a step fills in
 * the step, the replay row fills in the session to play.
 */
export type InspectorTarget =
  | {
      kind: "step"
      step: RunStep
      /** The step's work is in flight right now — its run is still live. */
      running: boolean
    }
  | { kind: "replay"; sessionId: string }

/**
 * The right-hand half of the console: what the selected row is worth, which is
 * either what a step produced — its output as JSON, the error that stopped it, or
 * a word on why there is neither — or the recording of the whole run.
 *
 * Rendered beside the logs only while a row is selected, so the console spends
 * its whole width on the run list until there is something to read.
 */
export function InspectorPanel({ target }: { target: InspectorTarget }) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-border">
      {/* Same header as the logs, so the two read as one console. */}
      <h2 className="shrink-0 border-b border-border px-3 py-1.5 text-xs font-medium tracking-wider text-muted-foreground uppercase">
        {target.kind === "replay" ? "Replay" : "Output"}
      </h2>

      {target.kind === "replay" ? (
        <SessionReplay
          sessionId={target.sessionId}
          className="min-h-0 flex-1"
        />
      ) : (
        <StepOutput step={target.step} running={target.running} />
      )}
    </section>
  )
}

// What a step produced, or why it has nothing yet.
function StepOutput({ step, running }: { step: RunStep; running: boolean }) {
  return (
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
