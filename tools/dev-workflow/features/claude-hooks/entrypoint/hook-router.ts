#!/usr/bin/env tsx

import * as readline from 'node:readline'
import {
  parseHookInput, routeToHandler, shouldSkipHooks 
} from '../use-cases/handle-hook'

async function readStdin(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  })

  const lines: string[] = []
  for await (const line of rl) {
    lines.push(line)
  }

  return lines.join('\n')
}

type JsonParseResult =
  | {
    success: true
    data: unknown
  }
  | { success: false }

function tryParseJson(input: string): JsonParseResult {
  try {
    return {
      success: true,
      data: JSON.parse(input),
    }
  } catch {
    return { success: false }
  }
}

function skipHooksOutput(): void {
  console.log(JSON.stringify({}))
}

async function main(): Promise<void> {
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
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
})
