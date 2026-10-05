import toposort from "toposort"
import { logger, metadata, task } from "@trigger.dev/sdk"
import { getWorkflow } from "../data"
import { Stagehand, browserbase } from "@browserbasehq/stagehand"
import { nodeExecutors } from "../nodes/node-executors"
import { interpolate, type RunOutputs } from "../lib/interpolate"

/**
 * One node's place in the run, published to run metadata under `steps` so the
 * canvas can paint progress without waiting for the run to finish.
 */
export type RunStep = {
  id: string
  status: "pending" | "running" | "done" | "failed"
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
    let steps: RunStep[] = order.map((id) => ({ id, status: "pending" }))

    const setStep = (id: string, status: RunStep["status"]) => {
      // Always a fresh array: metadata.set() hands the value to a background
      // flush, so mutating in place would let a later state be serialized in
      // place of the one being reported.
      steps = steps.map((step) => (step.id === id ? { ...step, status } : step))
      metadata.set("steps", steps)
    }

    metadata.set("steps", steps)

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

      setStep(id, "running")
      // Only the newest pending write for a key reaches the database, so without
      // this flush "running" is replaced by "done" before it is ever pushed and
      // the spinner never renders.
      await metadata.flush()

      try {
        outputs[id] = await executor({ values, getStagehand })
      } catch (err) {
        setStep(id, "failed")
        // A thrown run returns no output, so the flushed metadata is the only
        // way the failure ever reaches the canvas.
        await metadata.flush()
        throw err
      }

      setStep(id, "done")
    }

    // The finished state is guaranteed even for a run nobody was watching.
    return { steps }
  },
})
