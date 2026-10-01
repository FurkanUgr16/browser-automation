import { tasks } from "@trigger.dev/sdk"
import { NextResponse } from "next/server"
// Type-only import keeps the task code out of the Next.js bundle.
import type { helloWorldTask } from "@/trigger/example"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { message?: string }

  const handle = await tasks.trigger<typeof helloWorldTask>("hello-world", {
    message: body.message ?? "Hello from my app!",
  })

  return NextResponse.json({
    runId: handle.id,
    taskIdentifier: handle.taskIdentifier,
    // Scoped to this single run — hand it to the client to subscribe to live updates.
    publicAccessToken: handle.publicAccessToken,
  })
}
