import toposort from "toposort"
import { logger, task } from "@trigger.dev/sdk"
import { getWorkflow } from "../data"
import { Stagehand, browserbase } from "@browserbasehq/stagehand"
import { nodeExecutors } from "../nodes/node-executors"

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

    for (const id of order) {
      const node = byId.get(id)!
      logger.log(`Running step: ${node.data.title}`)

      const executor = nodeExecutors[node.data.type]
      if (executor) await executor({ values: node.data.values, getStagehand })
      // its progress os ui can watch the run live
    }

    return { steps: order.length }
  },
})
