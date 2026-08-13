import type { Workflow } from '../../domain/workflow'
import { createWorkflowDefinition } from '../../../../shell/workflow-definition'
import { createWorkflowRoutes } from './entrypoint'

type WorkflowDeps = Parameters<typeof Workflow.rehydrate>[1]

function buildWorkflow(
  definition: ReturnType<typeof createWorkflowDefinition>,
): ReturnType<typeof definition.buildWorkflow> {
  const deps: WorkflowDeps = {
    getGitInfo: () => ({
      currentBranch: 'main',
      workingTreeClean: true,
      headCommit: 'abc123',
      changedFilesVsDefault: [],
      hasCommitsVsDefault: false,
    }),
    getPrFeedback: () => ({
      reviewDecision: null,
      coderabbitReviewSeen: true,
      unresolvedCount: 0,
      threads: [],
    }),
    createPullRequest: () => ({
      prNumber: 1,
      prUrl: 'https://github.com/example/repo/pull/1',
      isDraft: false,
    }),
    listSessionReviews: () => [],
    sleepMs: () => undefined,
    now: () => '2026-01-01T00:00:00Z',
  }
  return definition.buildWorkflow(definition.initialState(), deps)
}

function transactionHandler(
  definition: ReturnType<typeof createWorkflowDefinition>,
  routeName: string,
) {
  const route = createWorkflowRoutes(definition.stateSchema)[routeName]
  if (route?.type !== 'transaction') return expect.fail(`Expected transaction route: ${routeName}`)
  return route.handler
}

describe('workflow route input boundary', () => {
  const definition = createWorkflowDefinition()
  const workflow = buildWorkflow(definition)

  it('rejects a non-number received for a numeric argument', () => {
    const handler = transactionHandler(definition, 'record-issue')

    expect(() => handler(workflow, 'not-a-number')).toThrow('Expected parsed number')
  })

  it('rejects a non-string received for a string argument', () => {
    const handler = transactionHandler(definition, 'record-branch')

    expect(() => handler(workflow, 2)).toThrow('Expected parsed string')
  })

  it('rejects a non-string optional URL received from the framework', () => {
    const handler = transactionHandler(definition, 'record-pr')

    expect(() => handler(workflow, 1, 2)).toThrow('Expected parsed optional string')
  })

  it('rejects non-array rest arguments received from the framework', () => {
    const handler = transactionHandler(definition, 'create-pr')

    expect(() => handler(workflow, 'not-an-array')).toThrow('Expected parsed string arguments')
  })

  it('rejects non-string values inside rest arguments received from the framework', () => {
    const handler = transactionHandler(definition, 'create-pr')

    expect(() => handler(workflow, ['valid', 2])).toThrow('Expected parsed string arguments')
  })
})
