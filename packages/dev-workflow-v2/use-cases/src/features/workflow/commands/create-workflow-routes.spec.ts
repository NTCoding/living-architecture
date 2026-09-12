import { defineRoutes } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { z } from 'zod'
import { describe, expect, it, vi } from 'vitest'
import { CreateWorkflowRoutes } from './create-workflow-routes'
import { Reviewer } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviews/reviewers'

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
    parsePullRequestDescriptionOptions: () =>
      inputOverrides.parseFailure
        ? { ok: false as const, reason: 'Expected pull request options.' }
        : {
            ok: true as const,
            input: {
              commitType: inputOverrides.commitType ?? 'feat',
              commitScope: 'workflow',
              title: inputOverrides.title ?? 'restore review agents',
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

  it('creates a pull request from parsed command input', () => {
    const { routes } = createRoutes()
    const createPr = vi.fn(() => ({ pass: true as const }))
    const workflow = Object.create({ createPr })

    routes['create-pr'].handler(workflow, ['--title', 'Restore review agents'])

    expect(createPr).toHaveBeenCalledOnce()
  })

  it('rejects an unsupported commit type', () => {
    const { routes } = createRoutes({ commitType: 'unsupported' })
    const workflow = Object.create({ createPr: vi.fn(() => ({ pass: true as const })) })

    expect(routes['create-pr'].handler(workflow, [])).toStrictEqual({
      pass: false,
      reason: expect.stringContaining('Expected --commit-type'),
    })
  })

  it('rejects a composed pull request title longer than 100 characters', () => {
    const { routes } = createRoutes({ title: 'a'.repeat(90) })
    const workflow = Object.create({ createPr: vi.fn(() => ({ pass: true as const })) })

    expect(routes['create-pr'].handler(workflow, [])).toStrictEqual({
      pass: false,
      reason: 'Expected composed pull request title to be at most 100 characters.',
    })
  })

  it('rejects an invalid pull request title', () => {
    const { routes } = createRoutes({ title: 'Invalid title' })
    const workflow = Object.create({ createPr: vi.fn(() => ({ pass: true as const })) })

    expect(routes['create-pr'].handler(workflow, [])).toStrictEqual({
      pass: false,
      reason: 'Expected --title to use lower case.',
    })
  })

  it('rejects an invalid pull request description', () => {
    const { routes } = createRoutes({ description: 'short' })
    const workflow = Object.create({ createPr: vi.fn(() => ({ pass: true as const })) })

    expect(routes['create-pr'].handler(workflow, [])).toStrictEqual({
      pass: false,
      reason: 'Expected --description to be at least 100 characters.',
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
    expect(() =>
      routes['record-reviewer-status'].handler(workflow, 'code-review', 'UNKNOWN'),
    ).toThrow('Unknown reviewer status')
  })
})
