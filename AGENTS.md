<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Database types

Derive database types from the Drizzle schema — never hand-write custom or partial
shapes for table rows. Export `typeof table.$inferSelect` (and `$inferInsert` when
needed) from `lib/schema.ts` and import it. When a consumer needs only some
columns, narrow with `Pick<Row, ...>` / `Omit<Row, ...>` rather than redeclaring a
literal type. Don't add an insert type where `db.insert(...).values()` already
enforces the shape.

# React Flow (ReactFlow) API and components

This project renders workflow canvases with React Flow. The installed package is
`@xyflow/react` v12 (`^12.12.0`) — React Flow's API has churned across v10/v11/v12
(`reactflow` → `@xyflow/react`, renamed hooks, `nodeTypes` stability rules, the
`Node<T>` / `Edge<T>` generic, `onConnect` payloads). Do **not** write React Flow code
from training data or recalled signatures.

Whenever a task touches React Flow APIs or components — importing anything from
`@xyflow/react`, using `<ReactFlow />` / `<Handle />` / `<Background />` / `<Controls />` /
`<MiniMap />` / `<NodeToolbar />` / custom nodes & edges, or any `use*` hook
(`useReactFlow`, `useNodesState`, `useStore`, `useNodesData`, `useUpdateNodeInternals`, …) —
look it up first:

1. Fetch https://reactflow.dev/llms.txt — an index of every guide, example, and API
   reference page with URLs and one-line descriptions. Use it to pick the right page
   (`/api-reference/hooks/...`, `/api-reference/components/...`, `/api-reference/types/...`,
   `/learn/...`, `/examples/...`).
2. Fetch the specific page(s) you need with `fetch_content` and copy the exact props,
   types, and import paths from them. Never guess a prop name or hook return shape.
3. Only fall back to the installed v12 type declarations in
   `node_modules/@xyflow/react/dist/esm/**` (`index.d.ts` re-exports every public type) or
   https://reactflow.dev/llms-full.txt (~900KB — fetch a slice, never the whole file) when
   the doc index is not enough.

Always import from `@xyflow/react`; a bare `reactflow` import is the stale v11 package and
must not be introduced. Existing canvas code to stay consistent with lives in
`features/workflows/components/canvas.tsx`, `features/workflows/nodes/node-registry.ts`, and
`features/workflows/nodes/step-node.tsx`. If a fetched page describes v11 or older
(`reactflow` package name, `useGraph()`), that is the wrong version — check the
"Migrate to v12" guide linked from the index.

<!-- TRIGGER.DEV SKILLS START -->
## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.agents/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-getting-started`, `trigger-realtime-and-frontend`, `trigger-authoring-chat-agent`.
<!-- TRIGGER.DEV SKILLS END -->
