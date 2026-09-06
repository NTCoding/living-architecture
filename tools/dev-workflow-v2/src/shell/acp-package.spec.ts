import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createAcpReviewAgentClient } from '@nt-ai-lab/deterministic-agent-workflow-acp'
import type { ReviewAgentClient } from '@nt-ai-lab/deterministic-agent-workflow-cli'

const processIdsSchema = z.array(z.number().int().safe().min(2)).length(2)
const processErrorSchema = z.object({ code: z.literal('ESRCH') })

function stopFixtureProcesses(path: string): void {
  if (!existsSync(path)) return
  for (const pid of processIdsSchema.parse(JSON.parse(readFileSync(path, 'utf8')))) {
    try {
      process.kill(pid, 'SIGKILL')
    } catch (error) {
      processErrorSchema.parse(error)
    }
  }
}

it('the published ACP package removes descendants when the agent exits before initialization', async () => {
  const workingDirectory = mkdtempSync(join(tmpdir(), 'living-acp-package-'))
  const processIdsPath = join(workingDirectory, 'process-ids.json')
  const client: ReviewAgentClient = createAcpReviewAgentClient({
    command: process.execPath,
    args: [fileURLToPath(new URL('./__fixtures__/acp-early-exit.mjs', import.meta.url))],
    environment: { ACP_FIXTURE_PIDS: processIdsPath },
    timeoutMs: 5_000,
    cancellationGraceMs: 100,
  })
  try {
    await expect(
      client.start({
        bundleId: 'published-package-proof',
        reviewType: 'package-proof',
        repository: 'fixture/repository',
        workingDirectory,
        pullRequestNumber: 1,
        baseRevision: 'a'.repeat(40),
        headRevision: 'b'.repeat(40),
        prompt: 'Exercise process cleanup, not a real review.',
      }),
    ).rejects.toThrow('ACP process exited before protocol completion (code 17')
    const processIds = processIdsSchema.parse(JSON.parse(readFileSync(processIdsPath, 'utf8')))
    await vi.waitFor(() => {
      for (const pid of processIds) expect(() => process.kill(pid, 0)).toThrow('ESRCH')
    })
  } finally {
    stopFixtureProcesses(processIdsPath)
    rmSync(workingDirectory, { recursive: true, force: true })
  }
})
