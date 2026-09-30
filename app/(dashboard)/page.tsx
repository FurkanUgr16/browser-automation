"use client"

import {
  OrganizationSwitcher,
  Show,
  SignOutButton,
  UserButton,
} from "@clerk/nextjs"
import { Plus, Workflow } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="flex flex-1 p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Workflow />
            </EmptyMedia>
            <EmptyTitle>No workflow selected</EmptyTitle>
            <EmptyDescription>
              Select a workflow from the sidebar or create a new one to get
              started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>
              <Plus /> New workflow
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    </div>
  )
}
