import { auth } from "@clerk/nextjs/server"

export default async function TestPage() {
  // Protected route: signed-out visitors are redirected to /sign-in
  const { userId } = await auth.protect({ unauthenticatedUrl: "/sign-in" })

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b px-6 py-4">
        <span className="font-medium">Sendkit</span>
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="flex max-w-md flex-col gap-4 text-sm leading-loose">
          <h1 className="font-medium">🔒 Protected test page</h1>
          <p>
            This page is protected with Clerk&apos;s{" "}
            <code className="font-mono text-xs">auth.protect()</code>. Only
            signed-in users can see it.
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            Your user ID: {userId}
          </p>
        </div>
      </main>
    </div>
  )
}
