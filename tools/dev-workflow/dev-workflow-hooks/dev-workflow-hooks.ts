#!/usr/bin/env tsx

import * as readline from 'node:readline'
import { hookInputSchema } from './claude-code-input-schemas'
import { handlePreToolUse } from './handlers/pre-tool-use'
import { handlePostToolUse } from './handlers/post-tool-use'
import { handleStop } from './handlers/stop'

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

function routeToHandler(input: ReturnType<typeof hookInputSchema.parse>): unknown {
  switch (input.hook_event_name) {
    case 'PreToolUse':
      return handlePreToolUse(input)
    case 'PostToolUse':
      return handlePostToolUse(input)
    case 'Stop':
      return handleStop(input)
  }
}

async function main(): Promise<void> {
  const rawInput = await readStdin()

  const parseResult = hookInputSchema.safeParse(JSON.parse(rawInput))
  if (!parseResult.success) {
    console.error(`Invalid hook input: ${parseResult.error.message}`)
    process.exit(2)
  }

  const output = routeToHandler(parseResult.data)
  console.log(JSON.stringify(output))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
})
