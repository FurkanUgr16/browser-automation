"use client"

import { TriangleAlertIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export default function WorkflowError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <div className="flex flex-1 p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlertIcon />
          </EmptyMedia>
          <EmptyTitle>Couldn&apos;t load this workflow</EmptyTitle>
          <EmptyDescription>
            Something went wrong while opening the editor. Try again, or go back
            to the dashboard.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {/* `retry` re-fetches and re-renders this segment; `reset` would only
              clear the error state and render the same failure again. */}
          <div className="flex items-center gap-2">
            <Button onClick={() => retry()}>Try again</Button>
            <Button variant="outline" asChild>
              <Link href="/">Dashboard</Link>
            </Button>
          </div>
          {error.digest ? (
            <p className="text-xs text-muted-foreground">
              Reference:{" "}
              <code className="font-mono">{error.digest.slice(0, 8)}</code>
            </p>
          ) : null}
        </EmptyContent>
      </Empty>
    </div>
  )
}
