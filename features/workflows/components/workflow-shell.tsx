"use client"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { RightSidebar } from "@/features/workflows/components/right-sidebar"

type WorkflowShellProps = {
  workflowId: string
}

const placeholder =
  "flex size-full items-center justify-center text-sm text-muted-foreground"

/**
 * Layout shell of the workflow editor: the canvas over the logs on the left, the
 * inspector on the right.
 *
 * Sizes are declared in `rem` rather than percentages so the panels keep their
 * proportions against the root font size, and the editor never squeezes a panel
 * below the point where its content is still usable.
 *
 * Panels are keyed by the workflow so a persisted layout (and any test selector)
 * stays attached to the workflow it belongs to.
 */
export function WorkflowShell({ workflowId }: WorkflowShellProps) {
  return (
    <ResizablePanelGroup className="size-full">
      <ResizablePanel id={`workflow-${workflowId}-primary`} minSize="30rem">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel id={`workflow-${workflowId}-canvas`} minSize="18rem">
            <div className={placeholder}>Canvas</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel
            id={`workflow-${workflowId}-logs`}
            defaultSize="8rem"
            minSize="6rem"
          >
            <div className={placeholder}>Logs</div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        id={`workflow-${workflowId}-inspector`}
        defaultSize="16rem"
        minSize="14rem"
        maxSize="36rem"
      >
        <RightSidebar workflowId={workflowId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
