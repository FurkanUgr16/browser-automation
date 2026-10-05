import toposort from "toposort"
import { logger, metadata, task } from "@trigger.dev/sdk"
import { getWorkflow } from "../data"
import { Stagehand, browserbase } from "@browserbasehq/stagehand"
import { nodeExecutors } from "../nodes/node-executors"
import { interpolate, type RunOutputs } from "../lib/interpolate"
import type { NodeType } from "../nodes/node-registry"

/**
 * Plain JSON — the only shape both the run metadata and the run output can carry.
 * Executors are typed as returning `unknown`, so their result is recorded as this
 * and the cast happens once, where it enters the step.
 */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

/**
 * One node's place in the run, published to run metadata under `steps` so the
 * canvas can paint progress and the console can show what each step did without
 * waiting for the run to finish.
 *
 * `type` and `title` are copied off the node so a step can be shown with its
 * icon and label without the graph in hand; `durationMs`, `output`, and `error`
 * fill in as the node runs.
 */
export type RunStep = {
  id: string
  type: NodeType
  title: string
  status: "pending" | "running" | "done" | "failed"
  /** Milliseconds the executor ran for; absent until the step finishes. */
  durationMs?: number
  /** Whatever the executor returned. */
  output?: JsonValue
  /** The thrown error's message, only for a step that failed. */
  error?: string
}

// Run metadata is capped at 256KB and the SDK throws when it is exceeded, and
// every step change republishes the whole list — so a node that returns the half
// of a page stops the run it is in. Only a preview of the output goes into the
// metadata; the full value still reaches the console through the run's output,
// which is allowed 10MB and which the provider prefers once the run is over.
const MAX_PUBLISHED_OUTPUT_CHARS = 16_000

function published(step: RunStep): RunStep {
  if (step.output === undefined) return step

  const json = JSON.stringify(step.output)
  if (json === undefined || json.length <= MAX_PUBLISHED_OUTPUT_CHARS) {
    return step
  }

  return {
    ...step,
    output: {
      truncated: true,
      preview: json.slice(0, MAX_PUBLISHED_OUTPUT_CHARS),
    },
  }
}

export const runWorkflowTask = task({
  id: "run-workflow",
  run: async ({ workflowId, orgId }: { workflowId: string; orgId: string }) => {
    const workflow = await getWorkflow(orgId, workflowId)

    if (!workflow.graph) throw new Error(`Workflow ${workflowId} has no graph`)

    const { edges, nodes } = workflow.graph

    const byId = new Map(nodes.map((n) => [n.id, n]))

    const connected = new Set(edges.flatMap((e) => [e.source, e.target]))

    const order = toposort
      .array(
        nodes.map((n) => n.id),
        edges.map((e) => [e.source, e.target])
      )
      .filter((id) => connected.has(id))

    logger.log(`Running step: ${workflow.name}`, { steps: order.length })

    // The browser is opened by the first node that needs one, so the session id is
    // captured here rather than at the top of the run and stays undefined for a
    // workflow that never drives a browser.
    let sessionId: string | undefined

    let stagehand: Stagehand | undefined
    const getStagehand = async () => {
      if (stagehand) return stagehand

      // Stagehand ships its Browserbase extension as a zip resolved from its own
      // `import.meta.url`. Trigger.dev bundles Stagehand into the worker, so that URL now
      // points at the bundle and the zip resolves to a path that was never copied there
      // (ENOENT .../features/workflows/dist/assets/stagehand-extension.zip).
      // Passing an `extensionId` makes Stagehand skip local provisioning entirely, so the
      // asset is never read. Upload the zip once and pin the id instead:
      //   browse cloud extensions upload ./node_modules/@browserbasehq/stagehand/dist/assets/stagehand-extension.zip
      // Re-upload and update BROWSERBASE_EXTENSION_ID whenever @browserbasehq/stagehand is bumped.
      const extensionId = process.env.BROWSERBASE_EXTENSION_ID
      if (!extensionId) {
        throw new Error(
          "BROWSERBASE_EXTENSION_ID is not set. Upload the Stagehand extension once with " +
            "`browse cloud extensions upload ./node_modules/@browserbasehq/stagehand/dist/assets/stagehand-extension.zip` " +
            "and set the returned id in .env.local (plus the Trigger.dev dashboard for deploys)."
        )
      }

      const browser = await browserbase.launch({
        apiKey: process.env.BROWSERBASE_API_KEY as string,
        extensionId,
      })

      // Every run drives exactly one Browserbase session, and this id is what its
      // recording is fetched with.
      sessionId = browser.sessionId

      stagehand = await Stagehand.create({
        browser,
        model: {
          modelName: "google/gemini-3.6-flash",
        },
      })
      return stagehand
    }

    // Results of the nodes that already ran, keyed by node id, so a node can pull
    // them in with {{ nodeId.path }} placeholders. Nodes run in dependency order,
    // so everything a node references is in here by the time we reach it.
    const outputs: RunOutputs = {}

    // Everything we're about to run, published up front so the canvas can lay out
    // the whole path in its pending state before the first node starts.
    let steps: RunStep[] = order.map((id) => {
      const { type, title } = byId.get(id)!.data
      return { id, type, title, status: "pending" as const }
    })

    const publish = () => {
      // Always a fresh array: metadata.set() hands the value to a background
      // flush, so mutating in place would let a later state be serialized in
      // place of the one being reported.
      metadata.set("steps", steps.map(published))
    }

    const setStep = (
      id: string,
      patch: Partial<Omit<RunStep, "id" | "type" | "title">>
    ) => {
      steps = steps.map((step) =>
        step.id === id ? { ...step, ...patch } : step
      )
      publish()
    }

    publish()

    for (const id of order) {
      const node = byId.get(id)!
      logger.log(`Running step: ${node.data.title}`)

      const executor = nodeExecutors[node.data.type]
      if (!executor) continue

      const values = Object.fromEntries(
        Object.entries(node.data.values).map(([key, value]) => [
          key,
          interpolate(value, outputs),
        ])
      )

      setStep(id, { status: "running" })
      // Only the newest pending write for a key reaches the database, so without
      // this flush "running" is replaced by "done" before it is ever pushed and
      // the spinner never renders.
      await metadata.flush()

      const startedAt = Date.now()

      try {
        const output = await executor({ values, getStagehand })
        outputs[id] = output
        setStep(id, {
          status: "done",
          durationMs: Date.now() - startedAt,
          // Executors hand back plain JSON (whatever Stagehand returned), which is
          // what both the metadata and the run output store.
          output: output as JsonValue,
        })
      } catch (err) {
        setStep(id, {
          status: "failed",
          durationMs: Date.now() - startedAt,
          error: err instanceof Error ? err.message : String(err),
        })
        // A thrown run returns no output, so the flushed metadata is the only
        // way the failure ever reaches the canvas.
        await metadata.flush()
        throw err
      }
    }

    // The finished state is guaranteed even for a run nobody was watching.
    //
    // The session id belongs to the output and not to the metadata: Browserbase
    // records against the session it has closed, so there is nothing to replay for
    // a run that is still going and no reason to publish an id nobody can use yet.
    return { steps, sessionId }
  },
})
