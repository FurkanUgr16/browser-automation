"use client"

import { useEffect, useState } from "react"
import {
  ConnectionLineType,
  Controls,
  ReactFlow,
  type ColorMode,
  type Edge,
  NodeTypes,
} from "@xyflow/react"
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow"
import { useTheme } from "next-themes"
import { StepNode } from "../nodes/step-node"
import { StepNodeType } from "../nodes/node-registry"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-flow/styles.css"
import "@liveblocks/react-ui/styles.css"

/**
 * The example flow from the React Flow "Building a Flow" guide: an input node
 * and an output node wired together. `input` and `output` are built-in types,
 * so the first node only exposes a source handle and the second only a target.
 *
 * Placeholder content — swap it for the workflow's own nodes and edges once the
 * editor reads real graph data.
 */

const nodeTypes: NodeTypes = { step: StepNode }

const initialNodes: StepNodeType[] = [
  {
    id: "n1",
    position: { x: 0, y: 0 },
    data: { type: "start", kind: "trigger", title: "Start", values: {} },
    type: "step",
  },
  {
    id: "n2",
    position: { x: 320, y: 0 },
    data: {
      type: "open-url",
      kind: "action",
      title: "Open URL",
      values: { url: "" },
    },
    type: "step",
  },
]

const initialEdges: Edge[] = [{ id: "e1", source: "n1", target: "n2" }]

/**
 * Left-hand canvas of the workflow editor: the graph itself, above the logs.
 *
 * React Flow measures its container, so the wrapper has to carry a size - the
 * resizable panel it lives in provides one.
 */
export function Canvas() {
  const { resolvedTheme } = useTheme()

  // `resolvedTheme` is the mode the app actually settled on - the same value that
  // puts `dark` on `<html>` - so the canvas switches together with the rest of the
  // UI even while the user's own choice is still "system".
  //
  // Until this client component mounts there is no theme to read, and the server
  // has none either - React Flow renders its light palette for that - so the first
  // paint stays on `light`. Switching any earlier would hydrate a different class
  // than the one in the HTML React just sent.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const colorMode: ColorMode =
    mounted && resolvedTheme === "dark" ? "dark" : "light"

  // Controlled flow, backed by Liveblocks Storage instead of local state: the
  // graph is shared with everyone in the room, and the `initial` lists below are
  // only written the first time a room is opened.
  //
  // `suspense: true` throws until Storage is ready, which the `ClientSideSuspense`
  // in <Room> covers, so `nodes` and `edges` are never `null` here. Deletions go
  // through `onDelete` - Storage ignores `remove` changes coming from
  // `onNodesChange`/`onEdgesChange`, so React Flow has to be told about it.
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<StepNodeType, Edge>({
      suspense: true,
      nodes: { initial: initialNodes },
      edges: { initial: initialEdges },
    })

  return (
    <div className="size-full">
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDelete={onDelete}
        colorMode={colorMode}
        fitView
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: "var(--border)" }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "var(--border)" },
        }}
        style={
          {
            "--xy-background-color": "var(--background)",
            "--xy-edge-stroke-width": 2,
            "--xy-connectionLine-stroke-width": 2,
          } as React.CSSProperties
        }
        maxZoom={1}
      >
        <Controls />
        <Cursors />
      </ReactFlow>
    </div>
  )
}
