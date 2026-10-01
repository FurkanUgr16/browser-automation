import { Spinner } from "@/components/ui/spinner"

export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Spinner className="size-5" />
        <span className="text-sm">Loading workflow</span>
      </div>
    </div>
  )
}
