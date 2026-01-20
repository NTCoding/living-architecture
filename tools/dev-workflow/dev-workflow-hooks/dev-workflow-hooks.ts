#!/usr/bin/env tsx
// Re-export from new location - will be removed after full restructure
export { routeToHandler } from '../features/claude-hooks/use-cases/handle-hook'

import { CLAUDE_SDK_AGENT_ENV_VAR } from '../platform/infra/external-clients/claude-agent'

import * as readline from 'node:readline'
import { hookInputSchema } from '../features/claude-hooks/domain/hook-input-schemas'
import type { HookOutput } from '../features/claude-hooks/domain/hook-output-schemas'
import { routeToHandler } from '../features/claude-hooks/use-cases/handle-hook'

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

function isRunningAsSDKSpawnedAgent(): boolean {
  const sdkAgentEnv = process.env[CLAUDE_SDK_AGENT_ENV_VAR]
  if (!sdkAgentEnv) {
    return false
  }
  return sdkAgentEnv.toLowerCase() === 'true' || sdkAgentEnv === '1'
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

  const output: HookOutput = routeToHandler(parseResult.data)
  console.log(JSON.stringify(output))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(2)
})
