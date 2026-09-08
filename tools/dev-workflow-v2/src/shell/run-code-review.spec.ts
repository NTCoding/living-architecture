import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PlatformContext } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { configureWorkflow } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { ReviewerDefinition } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviewer-definitions'
import { createRunCodeReview } from './run-code-review'
import { noopReviewStore } from './noop-review-store'

type AcpReviewRunner = Parameters<typeof createRunCodeReview>[0]['runReviewer']
import {
  buildTestContext,
  cleanupDb,
  progressToState,
  runCommand,
  seedReviewerSatisfaction,
} from '../features/workflow/entrypoint/workflow/__fixtures__/workflow-cli-test-fixtures'

class AcpProcessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AcpProcessError'
  }
}

class AcpLaunchMissingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AcpLaunchMissingError'
  }
}

const runReviewer = vi.fn<AcpReviewRunner>()

vi.mock('@living-architecture/dev-workflow-v2-use-cases/external-clients/git/git-client', () => ({
  readGitRepositoryStatus: vi.fn().mockReturnValue({ changedFilesVsDefault: ['a.ts', 'b.ts'] }),
}))

const REVIEWERS = ReviewerDefinition.parseAll([
  {
    reviewType: 'code-review',
    agentInstructions: 'agents/code-review.md',
    version: '1',
  },
])

const databases: string[] = []
afterEach(() => {
  vi.clearAllMocks()
  for (const database of databases) cleanupDb(database)
  databases.length = 0
})

function buildPlatform(context: ReturnType<typeof buildTestContext>): PlatformContext {
  return {
    getPluginRoot: () => '/plugin-root',
    now: () => '2024-01-01T00:00:00Z',
    getSessionId: () => context.sessionId,
    workflowEventStore: context.store,
    reviewStore: noopReviewStore(),
  }
}

function buildRunCodeReview(
  context: ReturnType<typeof buildTestContext>,
  directory: string,
): ReturnType<typeof createRunCodeReview> {
  return createRunCodeReview({
    getWorkflowDefinition: () => configureWorkflow({ runCodeReview: () => undefined }),
    getPlatform: () => buildPlatform(context),
    pluginRoot: directory,
    runReviewer,
  })
}

function writeReviewerAssets(directory: string): void {
  mkdirSync(join(directory, 'agents'), { recursive: true })
  writeFileSync(join(directory, 'agents', 'code-review.md'), 'agent instructions')
}

describe('createRunCodeReview', () => {
  it('returns early when the workflow state has no persisted PR snapshot', () => {
    const directory = mkdtempSync(join(tmpdir(), 'run-code-review-'))
    try {
      const context = buildTestContext()
      databases.push(context.dbPath)
      progressToState(context, 'VERIFYING')
      buildRunCodeReview(context, directory)(REVIEWERS)
      expect(runReviewer).not.toHaveBeenCalled()
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      })
    }
  })

  it('builds the review prompt and records the completed review when a snapshot exists', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'run-code-review-'))
    try {
      writeReviewerAssets(directory)
      const context = buildTestContext()
      databases.push(context.dbPath)
      progressToState(context, 'REVIEWING')
      runReviewer.mockResolvedValue({
        payload: {
          verdict: 'PASS',
          findings: [],
        },
        providerSessionId: 'fixture-session',
      })
      buildRunCodeReview(context, directory)(REVIEWERS)
      await vi.waitFor(() => {
        expect(context.workflowDeps.listSessionReviews()).toHaveLength(1)
      })
      const launch = runReviewer.mock.calls[0]?.[0]
      expect(launch).toMatchObject({
        reviewType: 'code-review',
        workingDirectory: process.cwd(),
        reviewerDefinitionVersion: '1',
        attemptId: expect.stringMatching(/^review-example\/repo-123-code-review-/),
      })
      if (launch === undefined)
        throw new AcpLaunchMissingError('The reviewer launch was not captured.')
      expect(launch.prompt).toBe(
        [
          'You are reviewing pull request #123 in example/repo.',
          'Issue: 1',
          `Base revision: ${'a'.repeat(40)}`,
          `Head revision: ${'b'.repeat(40)}`,
          '',
          'Files to Review:',
          '- a.ts',
          '- b.ts',
          '',
          'agent instructions',
        ].join('\n'),
      )
      expect(context.workflowDeps.listSessionReviews()[0]).toMatchObject({
        verdict: 'PASS',
        reviewType: 'code-review',
        branch: 'feat/test',
        pullRequestNumber: 123,
        completionProvenance: {
          bundleId: 'review-example/repo-123',
          providerSessionId: 'fixture-session',
          baseRevision: 'a'.repeat(40),
          headRevision: 'b'.repeat(40),
          exactFiles: ['a.ts', 'b.ts'],
          reviewerDefinitionVersion: '1',
        },
      })
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      })
    }
  })

  it('launches nothing when every requested reviewer is already satisfied', () => {
    const directory = mkdtempSync(join(tmpdir(), 'run-code-review-'))
    try {
      writeReviewerAssets(directory)
      const context = buildTestContext()
      databases.push(context.dbPath)
      progressToState(context, 'REVIEWING')
      seedReviewerSatisfaction(context)
      runCommand(context, ['sync-reviewer-satisfaction'])
      buildRunCodeReview(context, directory)(REVIEWERS)
      expect(runReviewer).not.toHaveBeenCalled()
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      })
    }
  })

  it('records the exact failure as a blocking infrastructure finding when a reviewer fails', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'run-code-review-'))
    try {
      writeReviewerAssets(directory)
      const context = buildTestContext()
      databases.push(context.dbPath)
      progressToState(context, 'REVIEWING')
      runReviewer.mockRejectedValue(
        new AcpProcessError('ACP process exited before protocol completion'),
      )
      buildRunCodeReview(context, directory)(REVIEWERS)
      await vi.waitFor(() => {
        expect(context.workflowDeps.listSessionReviews()).toHaveLength(1)
      })
      expect(context.workflowDeps.listSessionReviews()[0]).toMatchObject({
        verdict: 'FAIL',
        reviewType: 'code-review',
        branch: 'feat/test',
        pullRequestNumber: 123,
        summary: 'Review infrastructure failure: the review did not run.',
        findings: [
          {
            status: 'blocking',
            title: 'Review infrastructure failure',
            details: 'ACP process exited before protocol completion',
          },
        ],
        completionProvenance: {
          bundleId: 'review-example/repo-123',
          providerSessionId: 'unavailable',
          baseRevision: 'a'.repeat(40),
          headRevision: 'b'.repeat(40),
          exactFiles: ['a.ts', 'b.ts'],
          reviewerDefinitionVersion: '1',
        },
      })
    } finally {
      rmSync(directory, {
        recursive: true,
        force: true,
      })
    }
  })
})
