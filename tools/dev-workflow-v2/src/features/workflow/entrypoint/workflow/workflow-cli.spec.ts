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

  it('records reviewer statuses as events while REVIEWING', () => {
    const context = setup()
    runCommand(context, ['init'])
    runCommand(context, ['record-issue', '42'])
    runCommand(context, ['record-branch', 'feat/test'])
    runCommand(context, ['transition', 'SUBMITTING_PR'])
    runCommand(context, ['transition', 'REVIEWING'])

    const statusEvents = context.engineDeps.store
      .readEvents(context.sessionId)
      .map(flattenStoredEvent)
      .filter((event) => event.type === 'reviewer-status-recorded')

    expect(statusEvents).toHaveLength(5)
    expect(statusEvents).toContainEqual(
      expect.objectContaining({ reviewer: 'code-review', status: 'APPROVED' }),
    )
    expect(context.engineDeps.store.listSessionReviews(context.sessionId)).toStrictEqual([])
  })

  it('does not expose manual pull request or local review commands', () => {
    const context = setup()
    runCommand(context, ['init'])

    expect(runCommand(context, ['create-pr'])).toMatchObject({
      exitCode: 1,
      output: 'Unknown test workflow command.',
    })
    expect(runCommand(context, ['record-pr', '1'])).toMatchObject({
      exitCode: 1,
      output: 'Unknown test workflow command.',
    })
  })

  it('rejects recording reviewer status outside REVIEWING', () => {
    const context = setup()
    runCommand(context, ['init'])

    const result = runCommand(context, ['record-reviewer-status', 'code-review', 'APPROVED'])
    expect(result.exitCode).toStrictEqual(2)
    expect(result.output).toContain('record-reviewer-status')
  })
})
