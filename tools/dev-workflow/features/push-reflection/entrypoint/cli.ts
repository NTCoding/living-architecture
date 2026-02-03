#!/usr/bin/env tsx
import { executePushReflection } from '../commands/push-reflection'

executePushReflection()
  .then((result) => {
    console.log(
      JSON.stringify({
        success: true,
        pushedFiles: result.pushedFiles,
      }),
    )
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.log(
      JSON.stringify({
        success: false,
        error: message,
      }),
    )
    process.exitCode = 1
  })
