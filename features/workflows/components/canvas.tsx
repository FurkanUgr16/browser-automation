"use client"

import { useEffect, useState } from "react"
import {
  addEdge,
  Background,
  ConnectionLineType,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type ColorMode,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react"
import { useTheme } from "next-themes"

import "@xyflow/react/dist/style.css"

/**
 * The example flow from the React Flow "Building a Flow" guide: an input node
 * and an output node wired together. `input` and `output` are built-in types,
 * so the first node only exposes a source handle and the second only a target.
 *
 * Placeholder content — swap it for the workflow's own nodes and edges once the
 * editor reads real graph data.
 */
const initialNodes: Node[] = [
  {
    id: "n1",
    position: { x: 0, y: 0 },
    data: { label: "Node 1" },
    type: "input",
  },
  {
    id: "n2",
    position: { x: 100, y: 100 },
    data: { label: "Node 2" },
    type: "output",
  },
]

const initialEdges: Edge[] = [
  {
    id: "n1-n2",
    source: "n1",
    target: "n2",
    type: "smoothstep",
    label: "connects with",
  },
]

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

  // Controlled flow: dragging nodes and drawing new edges writes back to state.
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = (connection: Connection) => {
    setEdges((current) => addEdge(connection, current))
  }

  return (
    <div className="size-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
      </ReactFlow>
    </div>
  )
}
