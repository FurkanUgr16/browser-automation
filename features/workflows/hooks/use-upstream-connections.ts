import { useMemo } from "react"
import { getIncomers, useEdges, useNodes } from "@xyflow/react"

import {
  nodeRegistry,
  type NodeDefinition,
  type NodeType,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"

// One output of an upstream node, ready to be dropped into a field.
export type UpstreamConnection = {
  /** The node that produces it — the key of a `{{ nodeId.path }}` token. */
  nodeId: string
  /** The source node's type, so callers can show its icon. */
  type: NodeType
  /** Path into the source node's output, e.g. "title". */
  path: string
  /** Ready-to-insert placeholder, e.g. `{{ n2.title }}`. */
  token: string
  /** Friendly label, e.g. "Open URL 1 · Title". */
  label: string
}

/**
 * Every output the nodes upstream of `node` produce, so the inspector can offer
 * them as placeholders instead of making people type raw node ids.
 *
 * Walks the connections all the way back, not just the direct parents, and
 * recomputes as edges come and go. Nearest nodes come first — they are the ones
 * you are most likely to reference.
 */
export function useUpstreamConnections(
  node: StepNodeType | undefined
): UpstreamConnection[] {
  const nodes = useNodes<StepNodeType>()
  const edges = useEdges()

  return useMemo(() => {
    if (!node) return []

    const connections: UpstreamConnection[] = []
    // Also stops the walk dead on a cycle: the graph is only checked for those
    // when a run starts, so editing can leave one in place.
    const seen = new Set([node.id])

    const queue = getIncomers(node, nodes, edges)
    while (queue.length > 0) {
      const source = queue.shift()!
      if (seen.has(source.id)) continue
      seen.add(source.id)

      const definition: NodeDefinition = nodeRegistry[source.data.type]
      for (const output of definition.outputs) {
        connections.push({
          nodeId: source.id,
          type: source.data.type,
          path: output.path,
          token: `{{ ${source.id}.${output.path} }}`,
          label: `${source.data.title} · ${output.label}`,
        })
      }

      queue.push(...getIncomers(source, nodes, edges))
    }

    return connections
  }, [node, nodes, edges])
}
