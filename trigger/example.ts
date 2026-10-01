import { logger, schemaTask, wait } from "@trigger.dev/sdk"
import { z } from "zod"

export const helloWorldTask = schemaTask({
  id: "hello-world",
  schema: z.object({
    message: z.string().default("Hello, world!"),
  }),
  // Set an optional maxDuration to prevent tasks from running indefinitely
  maxDuration: 300, // Stop executing after 300 secs (5 mins) of compute
  run: async (payload, { ctx }) => {
    logger.info("Hello, world!", { payload, ctx })

    await wait.for({ seconds: 5 })

    return {
      message: payload.message,
    }
  },
})
