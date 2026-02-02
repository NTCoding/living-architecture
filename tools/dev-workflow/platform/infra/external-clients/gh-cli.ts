import { execFileSync } from 'node:child_process'
import { z } from 'zod'

interface CIResult {
  failed: boolean
  output: string
}

const NO_CHECKS_PATTERN = /no checks reported/i
const RETRY_DELAY_MS = 10_000
const MAX_RETRIES = 6

function sleep(ms: number): void {
  execFileSync('/usr/bin/env', ['sleep', String(ms / 1000)])
}

const processErrorSchema = z.object({
  stdout: z.string().optional(),
  stderr: z.string().optional(),
})

function extractProcessOutput(error: unknown): string {
  const parsed = processErrorSchema.safeParse(error)
  if (parsed.success) {
    const stdout = parsed.data.stdout?.trim() ?? ''
    const stderr = parsed.data.stderr?.trim() ?? ''
    const combined = [stdout, stderr].filter(Boolean).join('\n')
    if (combined.length > 0) {
      return combined
    }
  }
  return error instanceof Error ? error.message : String(error)
}

function runGhChecks(prNumber: number): CIResult {
  try {
    const output = execFileSync(
      '/usr/bin/env',
      ['gh', 'pr', 'checks', String(prNumber), '--watch'],
      {
        encoding: 'utf-8',
        timeout: 10 * 60 * 1000,
      },
    )
    return {
      failed: false,
      output,
    }
  } catch (error: unknown) {
    return {
      failed: true,
      output: extractProcessOutput(error),
    }
  }
}

function watchWithRetry(prNumber: number, remainingAttempts: number): CIResult {
  const result = runGhChecks(prNumber)

  if (!result.failed || !NO_CHECKS_PATTERN.test(result.output)) {
    return result
  }

  if (remainingAttempts <= 1) {
    return result
  }

  sleep(RETRY_DELAY_MS)
  return watchWithRetry(prNumber, remainingAttempts - 1)
}

export const ghCli = {
  watchCI(prNumber: number): CIResult {
    return watchWithRetry(prNumber, MAX_RETRIES)
  },
}
