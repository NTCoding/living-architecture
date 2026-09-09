import { afterEach, describe, expect, it } from 'vitest'
import { flattenStoredEvent } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { buildTestContext, cleanupDb, runCommand } from './__fixtures__/workflow-cli-test-fixtures'

describe('workflow-cli commands', () => {
  const dbPaths: string[] = []

  afterEach(() => dbPaths.splice(0).forEach(cleanupDb))

  function setup(overrides?: Parameters<typeof buildTestContext>[0]) {
    const context = buildTestContext(overrides)
    dbPaths.push(context.dbPath)
    return context
  }

  it('returns the configured error for an unknown command', () => {
    const context = setup()

    expect(runCommand(context, ['bogus'])).toMatchObject({
      exitCode: 1,
      output: 'Unknown test workflow command.',
    })
  })

  it('records only reviewer status while REVIEWING', () => {
    const context = setup()
    runCommand(context, ['init'])
    runCommand(context, ['record-issue', '42'])
    runCommand(context, ['record-branch', 'feat/test'])
    runCommand(context, ['transition', 'SUBMITTING_PR'])
    runCommand(context, ['transition', 'REVIEWING'])

    const result = runCommand(context, ['record-reviewer-status', 'code-review', 'OPEN_FEEDBACK'])

    expect(result.exitCode).toBe(0)
    expect(
      context.engineDeps.store
        .readEvents(context.sessionId)
        .map(flattenStoredEvent)
        .filter((event) => event.type === 'reviewer-status-recorded'),
    ).toStrictEqual([expect.objectContaining({ reviewer: 'code-review', status: 'OPEN_FEEDBACK' })])
    expect(context.engineDeps.store.listSessionReviews(context.sessionId)).toStrictEqual([])
  })

  it('does not expose manual pull request or local review commands', () => {
    const context = setup()
    runCommand(context, ['init'])

    expect(runCommand(context, ['create-pr']).exitCode).toBe(1)
    expect(runCommand(context, ['record-pr', '1']).exitCode).toBe(1)
  })
})
