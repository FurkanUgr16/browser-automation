import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"

import { nodeRegistry, type StepNodeType } from "./node-registry"
import { useLatestRunSteps } from "@/features/workflows/components/workflow-runs-provider"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

function StepNodeComponent({ id, data, selected }: NodeProps<StepNodeType>) {
  const { type, kind, title, values } = data
  const def = nodeRegistry[type]
  const Icon = def.icon
  const fields = def.fields.filter((field) => values[field.key])

  // A trigger starts the flow and takes no input, so it has no target handle.
  const hasTarget = kind !== "trigger"

  // Where this node got to in the newest run. The list is shared by every node
  // through one subscription, so this only costs a lookup.
  const { steps, isLive } = useLatestRunSteps()
  const status = steps.find((step) => step.id === id)?.status

  // A run that was killed rather than finishing cleanly leaves its last node
  // marked "running", so the spinner only turns while the run itself is live.
  const running = isLive && status === "running"
  const failed = status === "failed"

  return (
    <div
      className={cn(
        "max-w-80 min-w-50 rounded-(--radius) border-2 border-border bg-card text-card-foreground",
        running && "border-blue-500",
        failed && "border-destructive",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background"
      )}
    >
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ transform: "translate(-100%, -50%)" }}
          className="h-3.5! w-1.5! min-w-0! rounded-l-xs! rounded-r-none! border-0! bg-border!"
        />
      )}

      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md",
            def.accent
          )}
        >
          {running ? <Spinner /> : <Icon className="size-4" />}
        </div>
        <span className="text-sm font-semibold">{title}</span>
      </div>

      {fields.length > 0 && (
        <>
          <div className="border-t border-border">
            <div className="flex flex-col gap-1.5 px-3 py-2.5">
              {fields.map((f) => (
                <div
                  key={f.key}
                  className="flex items-center justify-between gap-4 text-xs"
                >
                  <span className="shrink-0 text-muted-foreground">
                    {f.label}
                  </span>
                  <span className="truncate font-medium">{values[f.key]}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Handle
        type="source"
        position={Position.Right}
        style={{ transform: "translate(100%, -50%)" }}
        className="h-3.5! w-1.5! min-w-0! rounded-l-none! rounded-r-xs! border-0! bg-border!"
      />
    </div>
  )
}

export const StepNode = memo(StepNodeComponent)
