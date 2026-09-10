import { defineRoutes } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { z } from 'zod'
import { describe, expect, it, vi } from 'vitest'
import { CreateWorkflowRoutes } from './create-workflow-routes'
import { Reviewer } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviews/reviewers'

function createRoutes() {
  const recordIssue = vi.fn(() => ({ pass: true as const }))
  const recordBranch = vi.fn(() => ({ pass: true as const }))
  const recordReviewerStatus = vi.fn(() => ({ pass: true as const }))
  const routes = new CreateWorkflowRoutes(
    { getSchema: () => z.enum(['IMPLEMENTING', 'REVIEWING']) },
    defineRoutes,
  ).execute({
    parseNumberArgument: (value) => Number(value),
    parseStringArgument: (value) => String(value),
    recordIssue,
    recordBranch,
    recordReviewerStatus,
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
