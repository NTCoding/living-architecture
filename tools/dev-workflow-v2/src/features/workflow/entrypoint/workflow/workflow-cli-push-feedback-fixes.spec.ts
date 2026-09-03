import { afterEach, describe, expect, it } from 'vitest'
import type { TestContext } from './__fixtures__/workflow-cli-test-fixtures'
import {
  buildTestContext,
  cleanupDb,
  progressToState,
  runCommand,
} from './__fixtures__/workflow-cli-test-fixtures'

describe('push-feedback-fixes workflow operation', () => {
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

  it('succeeds while addressing feedback', () => {
    const ctx = setup({
      getPrFeedback: () => ({
        reviewDecision: 'CHANGES_REQUESTED',
        coderabbitReviewSeen: true,
        unresolvedCount: 1,
        threads: [],
      }),
    })
    progressToState(ctx, 'ADDRESSING_FEEDBACK')

    const result = runCommand(ctx, ['push-feedback-fixes'])

    expect(result.exitCode).toStrictEqual(0)
  })

  it('is rejected outside ADDRESSING_FEEDBACK', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const result = runCommand(ctx, ['push-feedback-fixes'])

    expect(result.exitCode).toStrictEqual(2)
  })
})
