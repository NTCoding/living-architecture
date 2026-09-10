import { expect, it, vi } from 'vitest'
import { spawnSync } from 'node:child_process'
import type { SpawnSyncReturns } from 'node:child_process'
import { WorkflowState } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow-types'
import { AcpClient } from '../../../../infra/external-clients/acp/acp-client'
import { createAcpReviewLauncher } from './acp-review-launcher'

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))

const mockSpawnSync = vi.mocked(spawnSync)

function successfulWorker(): SpawnSyncReturns<string> {
  return { pid: 1, output: ['', '', ''], stdout: '', stderr: '', status: 0, signal: null }
}

it('translates each review launch into an ACP prompt using its reviewer guidelines', () => {
  mockSpawnSync.mockReturnValue(successfulWorker())
  const launcher = createAcpReviewLauncher(
    new AcpClient({ workerPath: '/worker.js', provider: 'pi', cwd: '/repo' }),
    (reviewer) => `Instructions for ${reviewer}.`,
  )

  launcher.run([
    {
      pullRequestNumber: 42,
      reviewer: 'code-review',
      workflowState: WorkflowState.initial(),
    },
  ])

  expect(mockSpawnSync).toHaveBeenCalledWith(
    process.execPath,
    ['/worker.js'],
    expect.objectContaining({
      input: JSON.stringify({
        sessions: [
          {
            prompt:
              'Instructions for code-review.\n\n## ACP Review Delivery\n\nReview pull request #42. Publish every finding as a GitHub inline pull request comment beginning [code-review]. When every earlier [code-review] comment is resolved and no new finding exists, publish a GitHub pull request comment containing [code-review] APPROVED. Do not return findings or a verdict to the caller.',
          },
        ],
        command: 'npx',
        args: ['-y', 'pi-acp'],
      }),
    }),
  )
})
