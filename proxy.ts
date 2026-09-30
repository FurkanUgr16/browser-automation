import { clerkMiddleware } from "@clerk/nextjs/server"

// Routes that stay publicly accessible
const PUBLIC_PATHS = ["/sign-in", "/sign-up"]

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (!isPublic) {
    // Protect everything else — signed-out visitors are redirected to sign-in
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
}
