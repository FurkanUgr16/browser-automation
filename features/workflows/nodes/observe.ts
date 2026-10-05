import type { Stagehand } from "@browserbasehq/stagehand"

// The actionable elements that fit the instruction. Nothing is clicked: observe
// only reports what it found, which makes it the "what can I press" half of an
// observe-then-act pair.
export async function observe({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const { data } = await stagehand.observe(instruction)

  // The two halves of a match worth handing on: the selector to act on, and what
  // Stagehand thinks the element is. The method/arguments it also returns belong
  // to replaying an action, which is the act node's job.
  const matches = data.map(({ selector, description }) => ({
    selector,
    description,
  }))

  return { count: matches.length, matches }
}
