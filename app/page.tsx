"use client"

import {
  OrganizationSwitcher,
  Show,
  SignOutButton,
  UserButton,
} from "@clerk/nextjs"
import { Button } from "@/components/ui/button"

export default function Page() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <span className="font-medium">Browser Automation</span>
        <Show when="signed-in">
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-center gap-2">
              <UserButton />
              <OrganizationSwitcher />
            </div>
            <SignOutButton>
              <Button variant="outline">Sign out</Button>
            </SignOutButton>
          </div>
        </Show>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in. Welcome!
        </p>
      </main>
    </div>
  )
}
