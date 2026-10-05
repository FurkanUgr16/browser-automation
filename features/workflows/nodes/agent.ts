import type { Stagehand } from "@browserbasehq/stagehand"

// v4 deleted `agent()` — "nothing in v4 replaces it one-for-one" — and points at a
// loop you own, with your own step bound and your own stop condition. This is that
// loop: observe what the instruction could act on, replay the first candidate not
// already tried, and repeat until the page stops offering anything new or the
// budget runs out.
//
// Each step is one inference (observe) plus a replayed action, so the loop cannot
// re-plan itself into a side effect nobody asked for. A failed act ends the run
// instead of retrying it: by then Stagehand may already have clicked or submitted.
// What the loop deliberately does not do is repeat one action on a page that never
// changed — that needs a counter, and a counter belongs in a script, not here.
const MAX_STEPS = 10

export async function agent({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const tried = new Set<string>()
  let steps = 0
  // The loop proved there is nothing left to do, as opposed to running out of budget.
  let completed = false
  let failure: string | undefined

  while (steps < MAX_STEPS) {
    const page = await stagehand.browser.context.activePage()
    const url = page ? await page.url() : ""
    // Keyed on the page as well as the element: the same "Next" button on a page we
    // have not seen yet is new work, the same button on an unchanged page is not.
    const alreadyTried = (selector: string) => tried.has(`${url}\n${selector}`)

    const { data: candidates } = await stagehand.observe(instruction)
    const next = candidates.find(
      (candidate) => !alreadyTried(candidate.selector)
    )

    if (!next) {
      completed = true
      break
    }

    const { data: result } = await stagehand.act(next)
    tried.add(`${url}\n${next.selector}`)
    steps++

    if (!result.success) {
      failure = result.message
      break
    }
  }

  const done = `${steps} step${steps === 1 ? "" : "s"}`
  let message: string
  if (failure) {
    message = `${done} in, then: ${failure}`
  } else if (steps === 0) {
    message = "Nothing on the page matched the instruction."
  } else if (completed) {
    message = `${done} completed.`
  } else {
    message = `${done} in, hit the ${MAX_STEPS}-step limit.`
  }

  return {
    // Every step it attempted worked, and there was at least one to attempt.
    success: steps > 0 && !failure,
    message,
    completed,
  }
}
