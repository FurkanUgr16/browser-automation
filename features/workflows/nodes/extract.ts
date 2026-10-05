import type { Stagehand } from "@browserbasehq/stagehand"

// Runs on Stagehand's default extract schema (`{ extraction: string }`) rather than
// one we declare, for two reasons: the node's only field is free text, so there is
// nothing to shape the result with, and Stagehand pins its own zod copy (4.4.3, the
// app has 4.6.5) whose `ZodType` a locally built schema does not satisfy. A
// multi-field extraction would need a schema field on the node and a deduped zod.
export async function extract({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const { data } = await stagehand.extract(instruction)

  return { result: data.extraction }
}
