import { describe, it, expect, afterEach } from 'vitest'
import { flattenStoredEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { TestContext } from './__fixtures__/workflow-cli-test-fixtures'
import {
  buildTestContext,
  cleanupDb,
  progressToState,
  runCommand,
  runReviewCommand,
  runReviewCommandWithJson,
} from './__fixtures__/workflow-cli-test-fixtures'

const CREATE_PR_DESCRIPTION = 'A'.repeat(100)

describe('workflow-cli commands', () => {
  const dbPaths: string[] = []

  afterEach(() => {
    for (const path of dbPaths) {
      cleanupDb(path)
    }
    dbPaths.length = 0
  })

  function setup(overrides?: Parameters<typeof buildTestContext>[0]): TestContext {
    const ctx = buildTestContext(overrides)
    dbPaths.push(ctx.dbPath)
    return ctx
  }

  it('returns configured error for unknown command', () => {
    const ctx = setup()
    const result = runCommand(ctx, ['bogus'])
    expect(result.exitCode).toStrictEqual(1)
    expect(result.output).toStrictEqual('Unknown test workflow command.')
  })

  describe('init', () => {
    it('starts a session', () => {
      const ctx = setup()
      const result = runCommand(ctx, ['init'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('rejects an empty transcript path', () => {
      const ctx = setup({ transcriptPath: '' })

      expect(() => runCommand(ctx, ['init'])).toThrow('transcriptPath must be a non-empty string.')
    })
  })

  describe('transition', () => {
    it('returns error when state argument is missing', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['transition'])
      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('missing required argument')
    })

    it('returns error for invalid state name', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['transition', 'INVALID_STATE'])
      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('invalid state')
    })
  })

  describe('record-issue', () => {
    it('records an issue number', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-issue', '42'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when number is missing', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-issue'])
      expect(result.exitCode).toStrictEqual(1)
    })

    it('returns error for non-numeric argument', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-issue', 'abc'])
      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('not a valid number')
    })
  })

  describe('record-branch', () => {
    it('records a branch name', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-branch', 'feat/test'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when branch is missing', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-branch'])
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('record-review', () => {
    it('records task-check review when reviewer returns pass verdict', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')

      const result = runReviewCommand(ctx, 'task-check', {
        verdict: 'PASS',
        summary: 'The implementation satisfies the task requirements.',
        findings: [],
      })

      expect(result.exitCode).toStrictEqual(0)
      expect(JSON.parse(result.output)).toStrictEqual({
        ok: true,
        id: 1,
        sessionId: 'test-sess',
        createdAt: '2024-01-01T00:00:00Z',
        reviewType: 'task-check',
        verdict: 'PASS',
      })
      expect(ctx.engineDeps.store.listSessionReviews(ctx.sessionId)).toStrictEqual([
        {
          id: 1,
          sessionId: 'test-sess',
          createdAt: '2024-01-01T00:00:00Z',
          reviewType: 'task-check',
          sourceState: 'REVIEWING',
          verdict: 'PASS',
          summary: 'The implementation satisfies the task requirements.',
          findings: [],
        },
      ])
      expect(ctx.engineDeps.store.readEvents(ctx.sessionId).map(flattenStoredEvent)).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'review-recorded',
            reviewType: 'task-check',
            verdict: 'PASS',
          }),
        ]),
      )
    })

    it('records task-check review when reviewer returns fail verdict', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')

      const result = runReviewCommand(ctx, 'task-check', {
        verdict: 'FAIL',
        summary: 'The implementation violates an architecture boundary.',
        findings: [
          {
            severity: 'major',
            title: 'Domain layer imports infrastructure module',
            details: 'The domain service imports a SQLite adapter directly.',
            rule: 'dependency-direction',
            file: 'src/domain/example.ts',
            startLine: 12,
            endLine: 12,
          },
        ],
      })

      expect(result.exitCode).toStrictEqual(0)
      expect(ctx.engineDeps.store.listSessionReviews(ctx.sessionId)).toStrictEqual([
        {
          id: 1,
          sessionId: 'test-sess',
          createdAt: '2024-01-01T00:00:00Z',
          reviewType: 'task-check',
          sourceState: 'REVIEWING',
          verdict: 'FAIL',
          summary: 'The implementation violates an architecture boundary.',
          findings: [
            {
              severity: 'major',
              title: 'Domain layer imports infrastructure module',
              details: 'The domain service imports a SQLite adapter directly.',
              rule: 'dependency-direction',
              file: 'src/domain/example.ts',
              startLine: 12,
              endLine: 12,
            },
          ],
        },
      ])
      expect(ctx.engineDeps.store.readEvents(ctx.sessionId).map(flattenStoredEvent)).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'review-recorded',
            reviewType: 'task-check',
            verdict: 'FAIL',
          }),
        ]),
      )
    })

    it('blocks workflow without recording review when reviewer returns invalid json', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')

      const result = runReviewCommandWithJson(ctx, 'task-check', '{')

      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('Invalid review JSON')
      expect(ctx.engineDeps.store.listSessionReviews(ctx.sessionId)).toStrictEqual([])
      expect(
        ctx.engineDeps.store
          .readEvents(ctx.sessionId)
          .map(flattenStoredEvent)
          .filter((event) => event.type === 'review-recorded'),
      ).toStrictEqual([])
    })

    it('blocks workflow without recording review when reviewer omits required fields', () => {
      const ctx = setup()
      progressToState(ctx, 'REVIEWING')

      const result = runReviewCommandWithJson(
        ctx,
        'task-check',
        JSON.stringify({ verdict: 'PASS' }),
      )

      expect(result.exitCode).toStrictEqual(1)
      expect(result.output).toContain('Invalid review payload')
      expect(ctx.engineDeps.store.listSessionReviews(ctx.sessionId)).toStrictEqual([])
      expect(
        ctx.engineDeps.store
          .readEvents(ctx.sessionId)
          .map(flattenStoredEvent)
          .filter((event) => event.type === 'review-recorded'),
      ).toStrictEqual([])
    })
  })

  describe('record-pr', () => {
    it('records PR number and optional URL', () => {
      const ctx = setup()
      progressToState(ctx, 'SUBMITTING_PR')
      const result = runCommand(ctx, ['record-pr', '123', 'https://github.com/pr/123'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when PR number is missing', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-pr'])
      expect(result.exitCode).toStrictEqual(1)
    })

    it('returns error for non-numeric PR number', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['record-pr', 'abc'])
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('create-pr', () => {
    it('creates ready pull request and records number and URL', () => {
      const capturedRequests: {
        readonly branch: string
        readonly title: string
        readonly body: string
      }[] = []
      const ctx = setup({
        createPullRequest: (request) => {
          capturedRequests.push(request)
          return {
            prNumber: 456,
            prUrl: 'https://github.com/example/repo/pull/456',
            isDraft: false,
            repository: 'example/repo',
            baseRevision: 'a'.repeat(40),
            headRevision: 'b'.repeat(40),
          }
        },
      })
      progressToState(ctx, 'SUBMITTING_PR')

      const result = runCommand(ctx, [
        'create-pr',
        '--title',
        'Ready PR',
        '--description',
        CREATE_PR_DESCRIPTION,
        '--problem',
        'Direct PR creation allowed draft PRs.',
        '--acceptance-criteria',
        '- PR is ready for review',
        '--key-changes',
        '- Add create-pr command',
        '--architecture-impact',
        'Workflow owns the body.',
        '--validation',
        '- pnpm test',
        '--notes',
        'None.',
      ])

      expect(result.exitCode).toStrictEqual(0)
      expect(capturedRequests).toStrictEqual([
        expect.objectContaining({
          branch: 'feat/test',
          title: 'Ready PR',
          body: expect.stringContaining('## Acceptance Criteria\n\n- PR is ready for review'),
        }),
      ])
      expect(ctx.engineDeps.store.readEvents(ctx.sessionId).map(flattenStoredEvent)).toStrictEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'pr-recorded',
            prNumber: 456,
            prUrl: 'https://github.com/example/repo/pull/456',
          }),
        ]),
      )
    })

    it('blocks when draft flag is provided', () => {
      const ctx = setup()
      progressToState(ctx, 'SUBMITTING_PR')

      const result = runCommand(ctx, ['create-pr', '--draft'])

      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('Expected value after --draft')
      expect(
        ctx.engineDeps.store
          .readEvents(ctx.sessionId)
          .map(flattenStoredEvent)
          .filter((event) => event.type === 'pr-recorded'),
      ).toStrictEqual([])
    })

    it('blocks when description is shorter than 100 characters', () => {
      const ctx = setup()
      progressToState(ctx, 'SUBMITTING_PR')

      const result = runCommand(ctx, [
        'create-pr',
        '--title',
        'Ready PR',
        '--description',
        'A'.repeat(99),
        '--problem',
        'Direct PR creation allowed draft PRs.',
        '--acceptance-criteria',
        '- PR is ready for review',
        '--key-changes',
        '- Add create-pr command',
        '--architecture-impact',
        'Workflow owns the body.',
        '--validation',
        '- pnpm test',
        '--notes',
        'None.',
      ])

      expect(result.exitCode).toStrictEqual(2)
      expect(result.output).toContain('Expected --description to be at least 100 characters.')
    })
  })

  describe('record-ci-passed', () => {
    it('records CI passed in AWAITING_CI state', () => {
      const ctx = setup()
      progressToState(ctx, 'AWAITING_CI')
      const result = runCommand(ctx, ['record-ci-passed'])
      expect(result.exitCode).toStrictEqual(0)
    })
  })

  describe('record-ci-failed', () => {
    it('records with output', () => {
      const ctx = setup()
      progressToState(ctx, 'AWAITING_CI')
      const result = runCommand(ctx, ['record-ci-failed', 'build failed'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('returns error when output is missing', () => {
      const ctx = setup()
      progressToState(ctx, 'AWAITING_CI')
      const result = runCommand(ctx, ['record-ci-failed'])
      expect(result.exitCode).toStrictEqual(1)
    })
  })

  describe('verify-feedback-addressed', () => {
    it('verifies live feedback in ADDRESSING_FEEDBACK state', () => {
      const ctx = setup({
        getPrFeedback: () => ({
          reviewDecision: 'CHANGES_REQUESTED',
          coderabbitReviewSeen: true,
          unresolvedCount: 2,
          threads: [],
        }),
      })
      progressToState(ctx, 'ADDRESSING_FEEDBACK')
      Object.defineProperty(ctx.workflowDeps, 'getPrFeedback', {
        value: () => ({
          reviewDecision: 'APPROVED',
          coderabbitReviewSeen: true,
          unresolvedCount: 0,
          threads: [],
        }),
      })
      const result = runCommand(ctx, ['verify-feedback-addressed'])
      expect(result.exitCode).toStrictEqual(0)
    })

    it('blocks when current PR feedback is still unresolved', () => {
      const ctx = setup({
        getPrFeedback: () => ({
          reviewDecision: 'CHANGES_REQUESTED',
          coderabbitReviewSeen: true,
          unresolvedCount: 1,
          threads: [],
        }),
      })
      progressToState(ctx, 'ADDRESSING_FEEDBACK')
      const result = runCommand(ctx, ['verify-feedback-addressed'])
      expect(result.exitCode).toStrictEqual(2)
    })

    it('is blocked outside ADDRESSING_FEEDBACK state', () => {
      const ctx = setup()
      runCommand(ctx, ['init'])
      const result = runCommand(ctx, ['verify-feedback-addressed'])
      expect(result.exitCode).toStrictEqual(2)
    })
  })
})
