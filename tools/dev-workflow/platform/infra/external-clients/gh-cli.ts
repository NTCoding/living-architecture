import { execFileSync } from 'node:child_process'

interface CIResult {
  failed: boolean
  output: string
}

export const ghCli = {
  watchCI(prNumber: number): CIResult {
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
      const message = error instanceof Error ? error.message : String(error)
      return {
        failed: true,
        output: message,
      }
    }
  },
}
