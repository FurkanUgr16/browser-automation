// Everything a workflow field can reference: each node that already ran in this
// run, keyed by its id, with whatever the node returned as its value.
export type RunOutputs = Record<string, unknown>

// {{ nodeId.path }} - the node id is the first segment, the rest is a path into
// that node's output ("title", "items[0].name").
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g

// "items[0].name" -> ["items", "0", "name"]
function toSegments(path: string): string[] {
  return path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean)
}

function getByPath(source: unknown, path: string): unknown {
  return toSegments(path).reduce<unknown>((value, key) => {
    if (value === null || typeof value !== "object") return undefined
    return (value as Record<string, unknown>)[key]
  }, source)
}

// Nothing resolves to "", an object becomes JSON, anything else is plain text.
function stringify(value: unknown): string {
  if (value === undefined || value === null) return ""
  return typeof value === "object" ? JSON.stringify(value) : String(value)
}

// Replace every {{ nodeId.path }} placeholder in one field's text with the value
// it points at, taken from the outputs of the nodes that ran before this one.
export function interpolate(text: string, outputs: RunOutputs): string {
  return text.replace(PLACEHOLDER, (_match, expression: string) => {
    const [nodeId, ...path] = expression
      .split(".")
      .map((part) => part.trim())
      .filter(Boolean)

    if (!nodeId || !(nodeId in outputs)) return ""

    return stringify(
      path.length ? getByPath(outputs[nodeId], path.join(".")) : outputs[nodeId]
    )
  })
}
