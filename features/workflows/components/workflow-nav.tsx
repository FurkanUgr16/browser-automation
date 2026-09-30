"use client"

import { Workflow } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const workflows = [
  "Workflows",
  "Runs",
  "Templates",
  "Integrations",
  "Credentials",
  "Settings",
]

export function WorkflowNav() {
  const { state } = useSidebar()

  const list = (
    <SidebarMenu>
      {workflows.map((workflow) => (
        <SidebarMenuItem key={workflow}>
          <SidebarMenuButton className="gap-y-0.5">
            {workflow}
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
            <Workflow />
          </SidebarMenuButton>
        </PopoverTrigger>
        <PopoverContent align="start" side="right">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton>
                <span>New workflow</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Separator />
          {list}
        </PopoverContent>
      </Popover>
    )
  }

  return list
}
