#!/usr/bin/env tsx

import {
  parseHookInput, routeToHandler, shouldSkipHooks 
} from '../commands/handle-hook'
import {
  readStdin, tryParseJson, skipHooksOutput 
} from '../../../platform/infra/cli/stdin-reader'
;(async () => {
  if (shouldSkipHooks()) {
    skipHooksOutput()
    return
  }

  const rawInput = await readStdin()

  const jsonResult = tryParseJson(rawInput)
  if (!jsonResult.success) {
    console.error('Invalid hook input: malformed JSON')
    process.exit(2)
  }

  const parseResult = parseHookInput(jsonResult.data)
  if (!parseResult.success) {
    console.error(`Invalid hook input: ${parseResult.error}`)
    process.exit(2)
  }

  const output = routeToHandler(parseResult.input)
  if ('_tag' in output) {
    if (output._tag === 'block') {
      console.error(output.reason)
      process.exit(2)
    }
    console.log(JSON.stringify({}))
    return
  }
  console.log(JSON.stringify(output))
})().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
})
