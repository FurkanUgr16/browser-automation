import type { Stagehand } from "@browserbasehq/stagehand"

// One instruction, one action on the active page (click, type, scroll). Stagehand
// reports a failed action as `success: false` instead of throwing, so the run
// keeps going and a downstream node can decide what the miss means.
export async function act({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const { data } = await stagehand.act(instruction)

  // The action may have moved the page — a link click or a form submit — so
  // where we ended up is part of the result, not something to re-derive later.
  const page = await stagehand.browser.context.activePage()

  return {
    success: data.success,
    message: data.message,
    url: page ? await page.url() : "",
  }
}
