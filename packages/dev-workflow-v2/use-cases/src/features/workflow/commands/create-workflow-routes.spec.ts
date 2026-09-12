import { defineRoutes } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { z } from 'zod'
import { assert, describe, expect, it, vi } from 'vitest'
import { PullRequestCreationDetails } from '@living-architecture/dev-workflow-v2-domain-model/domain/pull-request-description'
import { Reviewer } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviews/reviewers'
import { CreateWorkflowRoutes } from './create-workflow-routes'

function createRoutes(
  inputOverrides: Partial<{
    commitType: string
    title: string
    description: string
    parseFailure: boolean
  }> = {},
) {
  const recordIssue = vi.fn(() => ({ pass: true as const }))
  const recordBranch = vi.fn(() => ({ pass: true as const }))
  const recordReviewerStatus = vi.fn(() => ({ pass: true as const }))
  const routes = new CreateWorkflowRoutes(
    { getSchema: () => z.enum(['IMPLEMENTING', 'REVIEWING']) },
    defineRoutes,
  ).execute({
    parseNumberArgument: (value) => Number(value),
    parseStringArgument: (value) => String(value),
    parseStringArguments: (value) => z.array(z.string()).parse(value),
    recordIssue,
    recordBranch,
    recordReviewerStatus,
    formatPullRequestDetailsFailure: (failure) => `formatted:${failure.type}`,
    parsePullRequestDescriptionOptions: (args) =>
      inputOverrides.parseFailure
        ? { ok: false as const, reason: 'Expected pull request options.' }
        : {
            ok: true as const,
            input: {
              commitType: inputOverrides.commitType ?? optionValue(args, '--commit-type', 'feat'),
              commitScope: optionValue(args, '--commit-scope', 'workflow'),
              title: inputOverrides.title ?? optionValue(args, '--title', 'restore review agents'),
              description: inputOverrides.description ?? 'A'.repeat(100),
              problem: 'Problem',
              acceptanceCriteria: 'Criteria',
              keyChanges: 'Changes',
              architectureImpact: 'Impact',
              validation: 'Validation',
              notes: 'Notes',
            },
          },
  }).routes
  return { routes, recordIssue, recordBranch, recordReviewerStatus }
}

function optionValue(args: readonly string[], optionName: string, defaultValue: string): string {
  const optionIndex = args.indexOf(optionName)
  if (optionIndex === -1) return defaultValue
  const value = args[optionIndex + 1]
  assert(value !== undefined, `Expected value for ${optionName}.`)
  return value
}

describe('CreateWorkflowRoutes', () => {
  it('creates the workflow routes and delegates recordings', () => {
    const { routes, recordIssue, recordBranch, recordReviewerStatus } = createRoutes()
    expect(Object.keys(routes)).toStrictEqual([
      'init',
      'transition',
      'record-issue',
      'record-branch',
      'create-pr',
      'record-reviewer-status',
      'wait-for-coderabbit-and-close-review-cycle',
    ])
    const workflow = Object.create({})
    routes['record-issue'].handler(workflow, '42')
    routes['record-branch'].handler(workflow, 'issue-42')
    routes['record-reviewer-status'].handler(workflow, 'code-review', 'OPEN_FEEDBACK')
    expect(recordIssue).toHaveBeenCalledWith(workflow, 42)
    expect(recordBranch).toHaveBeenCalledWith(workflow, 'issue-42')
    expect(recordReviewerStatus).toHaveBeenCalledWith(
      workflow,
      Reviewer.fromName('code-review'),
      'OPEN_FEEDBACK',
    )
  })

  it('delegates closing the review cycle to the workflow', () => {
    const { routes } = createRoutes()
    const waitForCodeRabbitAndCloseReviewCycle = vi.fn(() => ({ pass: true as const }))
    const workflow = Object.create({ waitForCodeRabbitAndCloseReviewCycle })

    routes['wait-for-coderabbit-and-close-review-cycle'].handler(workflow)

    expect(waitForCodeRabbitAndCloseReviewCycle).toHaveBeenCalledWith()
  })

  it('creates a pull request from parsed command input', () => {
    const { routes } = createRoutes()
    const createPr = vi.fn(() => ({ pass: true as const }))
    const workflow = Object.create({ createPr })

    routes['create-pr'].handler(workflow, ['--title', 'publish workflow command'])

    const expectedDetails = PullRequestCreationDetails.from({
      commitType: 'feat',
      commitScope: 'workflow',
      title: 'publish workflow command',
      description: 'A'.repeat(100),
      problem: 'Problem',
      acceptanceCriteria: 'Criteria',
      keyChanges: 'Changes',
      architectureImpact: 'Impact',
      validation: 'Validation',
      notes: 'Notes',
    })
    assert(expectedDetails.ok)
    expect(createPr).toHaveBeenCalledOnce()
    expect(createPr).toHaveBeenCalledWith(expectedDetails.value)
  })

  it('rejects an unsupported commit type', () => {
    const { routes } = createRoutes({ commitType: 'unsupported' })
    const workflow = Object.create({ createPr: vi.fn(() => ({ pass: true as const })) })

    expect(routes['create-pr'].handler(workflow, [])).toStrictEqual({
      pass: false,
      reason: 'formatted:unsupported-commit-type',
    })
  })

  it('rejects a composed pull request title longer than 100 characters', () => {
    const { routes } = createRoutes({ title: 'a'.repeat(90) })
    const workflow = Object.create({ createPr: vi.fn(() => ({ pass: true as const })) })

    expect(routes['create-pr'].handler(workflow, [])).toStrictEqual({
      pass: false,
      reason: 'formatted:composed-title-too-long',
    })
  })

  it.each([
    { title: '', reason: 'formatted:empty-pull-request-title' },
    { title: 'ready pull request.', reason: 'formatted:pull-request-title-ends-with-full-stop' },
    { title: 'Invalid title', reason: 'formatted:pull-request-title-has-uppercase' },
  ])('rejects an invalid pull request title', ({ title, reason }) => {
    const { routes } = createRoutes({ title })
    const workflow = Object.create({ createPr: vi.fn(() => ({ pass: true as const })) })

    expect(routes['create-pr'].handler(workflow, [])).toStrictEqual({ pass: false, reason })
  })

  it.each(['', '   ', 'workflow\nstate', 'A'.repeat(21)])(
    'rejects an invalid commit scope',
    (commitScope) => {
      const { routes } = createRoutes()
      const workflow = Object.create({ createPr: vi.fn(() => ({ pass: true as const })) })

      expect(routes['create-pr'].handler(workflow, ['--commit-scope', commitScope])).toStrictEqual({
        pass: false,
        reason: 'formatted:invalid-commit-scope',
      })
    },
  )

  it('rejects an invalid pull request description', () => {
    const { routes } = createRoutes({ description: 'short' })
    const workflow = Object.create({ createPr: vi.fn(() => ({ pass: true as const })) })

    expect(routes['create-pr'].handler(workflow, [])).toStrictEqual({
      pass: false,
      reason: 'formatted:pull-request-description-too-short',
    })
  })

  it('rejects unparseable pull request options', () => {
    const { routes } = createRoutes({ parseFailure: true })
    const workflow = Object.create({ createPr: vi.fn(() => ({ pass: true as const })) })

    expect(routes['create-pr'].handler(workflow, [])).toStrictEqual({
      pass: false,
      reason: 'Expected pull request options.',
    })
  })

  it('rejects unknown reviewer names and statuses', () => {
    const { routes } = createRoutes()
    const workflow = Object.create({})
    expect(() => routes['record-reviewer-status'].handler(workflow, 'unknown', 'APPROVED')).toThrow(
      'Unknown reviewer',
    )
    expect(
      routes['record-reviewer-status'].handler(workflow, 'code-review', 'UNKNOWN'),
    ).toStrictEqual({ pass: false, reason: 'Unknown reviewer status: UNKNOWN' })
  })
})
