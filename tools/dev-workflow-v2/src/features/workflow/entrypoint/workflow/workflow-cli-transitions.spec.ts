import { afterEach, describe, expect, it } from 'vitest'
import { flattenStoredEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { buildTestContext, cleanupDb, runCommand } from './__fixtures__/workflow-cli-test-fixtures'

describe('workflow lifecycle', () => {
  const dbPaths: string[] = []
  afterEach(() => dbPaths.splice(0).forEach(cleanupDb))

  function setup(overrides?: Parameters<typeof buildTestContext>[0]) {
    const context = buildTestContext(overrides)
    dbPaths.push(context.dbPath)
    runCommand(context, ['init'])
    runCommand(context, ['record-issue', '1'])
    runCommand(context, ['record-branch', 'feat/test'])
    return context
  }

  it('creates and records a ready pull request on SUBMITTING_PR entry', () => {
    const context = setup({
      createPullRequest: () => ({
        prNumber: 78,
        prUrl: 'https://github.com/example/repo/pull/78',
        isDraft: false,
      }),
    })

    expect(runCommand(context, ['transition', 'SUBMITTING_PR']).exitCode).toBe(0)
    expect(
      context.engineDeps.store.readEvents(context.sessionId).map(flattenStoredEvent),
    ).toContainEqual(expect.objectContaining({ type: 'pr-recorded', prNumber: 78 }))
  })

  it('automatically enters feedback work when CodeRabbit has an unresolved thread', () => {
    const context = setup({
      getPrFeedback: () => ({
        reviewerStatuses: {
          'architecture-review': 'APPROVED', 'code-review': 'APPROVED', 'bug-scanner': 'APPROVED',
          'task-check': 'APPROVED', coderabbit: 'APPROVED',
        },
        reviewDecision: 'CHANGES_REQUESTED',
        coderabbitReviewSeen: true,
        unresolvedCount: 1,
        threads: [
          {
            id: 'thread',
            isResolved: false,
            isOutdated: false,
            path: 'src/a.ts',
            line: 1,
            comments: [{ author: { login: 'coderabbitai' }, body: 'Fix this.' }],
          },
        ],
      }),
    })
    runCommand(context, ['transition', 'SUBMITTING_PR'])

    expect(runCommand(context, ['transition', 'REVIEWING']).exitCode).toBe(0)
    expect(
      context.engineDeps.store.readEvents(context.sessionId).map(flattenStoredEvent),
    ).toContainEqual(
      expect.objectContaining({
        type: 'transitioned',
        from: 'REVIEWING',
        to: 'ADDRESSING_FEEDBACK',
      }),
    )
  })
})
