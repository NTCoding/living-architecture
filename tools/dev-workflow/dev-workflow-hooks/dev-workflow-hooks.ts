#!/usr/bin/env tsx

import * as readline from 'node:readline'
import { hookInputSchema } from './claude-code-input-schemas'
import type {
  PreToolUseOutput, PostToolUseOutput, StopOutput 
} from './claude-code-output-schemas'
import { handlePreToolUse } from './handlers/pre-tool-use'
import { handlePostToolUse } from './handlers/post-tool-use'
import { handleStop } from './handlers/stop'

type HookOutput = PreToolUseOutput | PostToolUseOutput | StopOutput

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

function routeToHandler(input: ReturnType<typeof hookInputSchema.parse>): HookOutput {
  switch (input.hook_event_name) {
    case 'PreToolUse':
      return handlePreToolUse(input)
    case 'PostToolUse':
      return handlePostToolUse(input)
    case 'Stop':
      return handleStop(input)
  }
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

function isRunningAsSDKSpawnedAgent(): boolean {
  return process.env.CLAUDE_SDK_AGENT === 'true'
}

function skipHooksForSDKAgents(): void {
  console.log(JSON.stringify({}))
}

async function main(): Promise<void> {
  if (isRunningAsSDKSpawnedAgent()) {
    skipHooksForSDKAgents()
    return
  }

  const rawInput = await readStdin()

  const jsonResult = tryParseJson(rawInput)
  if (!jsonResult.success) {
    console.error('Invalid hook input: malformed JSON')
    process.exit(2)
  }

  const parseResult = hookInputSchema.safeParse(jsonResult.data)
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
