import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlatformContext } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { configureWorkflow } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { ReviewerDefinition } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviewer-definitions'
import { createRunCodeReview } from './run-code-review'
import {
  buildTestContext,
  cleanupDb,
  progressToState,
} from '../features/workflow/entrypoint/workflow/__fixtures__/workflow-cli-test-fixtures'

const runMock = vi.fn()

vi.mock('@nt-ai-lab/deterministic-agent-workflow-cli', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@nt-ai-lab/deterministic-agent-workflow-cli')>()
  return {
    ...actual,
    ReviewCoordinator: vi.fn().mockImplementation(function () {
      return { run: runMock }
    }),
  }
})

vi.mock('@living-architecture/dev-workflow-v2-use-cases/external-clients/git/git-client', () => ({
  readGitRepositoryStatus: vi.fn().mockReturnValue({ changedFilesVsDefault: ['a.ts', 'b.ts'] }),
}))

import { readGitRepositoryStatus } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/git/git-client'
import { ReviewCoordinator } from '@nt-ai-lab/deterministic-agent-workflow-cli'

const mockedReadGit = vi.mocked(readGitRepositoryStatus)
const mockedCoordinator = vi.mocked(ReviewCoordinator)

const REVIEWERS = ReviewerDefinition.parseAll([
  { reviewType: 'code-review', agentInstructions: 'agents/code-review.md', version: '1' },
])

const databases: string[] = []
afterEach(() => {
  vi.clearAllMocks()
  for (const database of databases) cleanupDb(database)
  databases.length = 0
})

describe('createRunCodeReview', () => {
  it('returns early when the workflow state has no persisted PR snapshot', () => {
    const directory = mkdtempSync(join(tmpdir(), 'run-code-review-'))
    try {
      const context = buildTestContext()
      databases.push(context.dbPath)
      progressToState(context, 'VERIFYING')
      const platform: PlatformContext = {
        getPluginRoot: () => '/plugin-root',
        now: () => '2024-01-01T00:00:00Z',
        getSessionId: () => context.sessionId,
        workflowEventStore: context.store,
        reviewStore: context.store,
      }
      const runCodeReview = createRunCodeReview({
        getWorkflowDefinition: () => configureWorkflow({ runCodeReview: () => undefined }),
        getPlatform: () => platform,
        pluginRoot: directory,
        acpClient: {
          start: vi.fn(),
          load: vi.fn(),
          cancel: vi.fn(),
        },
      })
      runCodeReview(REVIEWERS)
      expect(runMock).not.toHaveBeenCalled()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('builds the review bundle request and fires the coordinator when a snapshot exists', () => {
    const directory = mkdtempSync(join(tmpdir(), 'run-code-review-'))
    try {
      mkdirSync(join(directory, 'states'), { recursive: true })
      writeFileSync(join(directory, 'states', 'reviewing.md'), 'state instructions')
      mkdirSync(join(directory, 'agents'), { recursive: true })
      writeFileSync(join(directory, 'agents', 'code-review.md'), 'agent instructions')
      const context = buildTestContext()
      databases.push(context.dbPath)
      progressToState(context, 'REVIEWING')
      const platform: PlatformContext = {
        getPluginRoot: () => '/plugin-root',
        now: () => '2024-01-01T00:00:00Z',
        getSessionId: () => context.sessionId,
        workflowEventStore: context.store,
        reviewStore: context.store,
      }
      const runCodeReview = createRunCodeReview({
        getWorkflowDefinition: () => configureWorkflow({ runCodeReview: () => undefined }),
        getPlatform: () => platform,
        pluginRoot: directory,
        acpClient: {
          start: vi.fn(),
          load: vi.fn(),
          cancel: vi.fn(),
        },
      })
      runCodeReview(REVIEWERS)
      expect(mockedReadGit).toHaveBeenCalledWith()
      expect(mockedCoordinator).toHaveBeenCalledWith({
        store: context.store,
        client: expect.any(Object),
        now: platform.now,
      })
      expect(runMock).toHaveBeenCalledWith(
        expect.objectContaining({
          bundleId: 'review-example/repo-123',
          sessionId: context.sessionId,
          repository: 'example/repo',
          pullRequestNumber: 123,
          baseRevision: 'a'.repeat(40),
          headRevision: 'b'.repeat(40),
          changedFiles: ['a.ts', 'b.ts'],
          stateInstructions: 'state instructions',
          reviews: [
            {
              reviewType: 'code-review',
              instructions: 'agent instructions',
              version: '1',
            },
          ],
        }),
        'REVIEWING',
      )
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
