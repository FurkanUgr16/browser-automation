"use client"

import { useTransition } from "react"
import {
  LoaderCircleIcon,
  PlusIcon,
  Workflow as WorkflowIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  SidebarGroupAction,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { Workflow } from "@/db/schema"
import { generateSlug } from "@/features/workflows/lib/generate-slug"

/**
 * Reference to the `createWorkflowAction` server action, handed down by the
 * server-rendered sidebar — a client component receives the bound reference
 * rather than importing the implementation.
 */
export type CreateWorkflowAction = (name: string) => Promise<void>

type WorkflowNavProps = {
  workflows: Workflow[]
  createWorkflowAction: CreateWorkflowAction
}

export function WorkflowNav({
  workflows,
  createWorkflowAction,
}: WorkflowNavProps) {
  const { state } = useSidebar()
  const [isPending, startTransition] = useTransition()

  const createWorkflow = () => {
    startTransition(async () => {
      try {
        // A generated name keeps workflows distinguishable without asking the
        // user for one, so a single click is enough. The action redirects to
        // the new workflow on success.
        await createWorkflowAction(generateSlug())
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create workflow"
        )
      }
    })
  }

  const pendingIcon = <LoaderCircleIcon className="animate-spin" />

  const list = (
    <SidebarMenu>
      {workflows.length === 0 && (
        <SidebarMenuItem>
          <SidebarMenuButton className="text-muted-foreground">
            No workflows yet
          </SidebarMenuButton>
        </SidebarMenuItem>
      )}
      {workflows.map((workflow) => (
        <SidebarMenuItem key={workflow.id}>
          <SidebarMenuButton className="gap-y-0.5">
            {workflow.name}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )

  if (state === "collapsed") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <SidebarMenuButton aria-label="Workflows">
            <WorkflowIcon />
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent align="start" side="right">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={createWorkflow} disabled={isPending}>
                {isPending ? pendingIcon : <PlusIcon />}
                <span>{isPending ? "Creating workflow" : "New workflow"}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Separator />
          {list}
        </PopoverContent>
      </Popover>
    )
  }

  // Rendered from inside the group content but positioned against the enclosing
  // `SidebarGroup`, so the action lines up with its label. Only the client can
  // own the click handler, so the button lives here.
  return (
    <>
      <SidebarGroupAction
        onClick={createWorkflow}
        disabled={isPending}
        title="New workflow"
      >
        {isPending ? pendingIcon : <PlusIcon />}
        <span className="sr-only">New workflow</span>
      </SidebarGroupAction>
      {list}
    </>
  )
}
