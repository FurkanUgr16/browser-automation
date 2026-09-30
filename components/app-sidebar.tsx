"use client"

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { Plus, Workflow } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Workflows",
    url: "/",
    icon: Workflow,
  },
  {
    title: "Runs",
    url: "/",
    icon: Workflow,
  },
  {
    title: "Templates",
    url: "/",
    icon: Workflow,
  },
  {
    title: "Integrations",
    url: "/",
    icon: Workflow,
  },
  {
    title: "Credentials",
    url: "/",
    icon: Workflow,
  },
  {
    title: "Settings",
    url: "/",
    icon: Workflow,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" collapsible={"icon"} {...props}>
      <SidebarHeader className="flex-row items-center justify-between gap-2 overflow-hidden group-data-[collapsible=icon]:justify-center">
        <OrganizationSwitcher
          appearance={{
            elements: {
              rootBox: "flex-1 min-w-0 group-data-[collapsible=icon]:hidden!",
              organizationSwitcherTrigger: "w-full justify-between",
            },
          }}
        />
        <SidebarTrigger className="shrink-0" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupAction title="New workflow">
            <Plus />
            <span className="sr-only">New workflow</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="group-data-[collapsible=icon]:items-center">
        <UserButton
          appearance={{
            elements: {
              rootBox: "w-full",
              userButtonTrigger:
                "w-full justify-start group-data-[collapsible=icon]:justify-center",
              userButtonOuterIdentifier:
                " group-data-[collapsible=icon]:hidden",
            },
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
