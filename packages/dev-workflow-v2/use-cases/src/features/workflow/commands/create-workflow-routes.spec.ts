import { defineWorkflowRoutes } from '../../../infra/external-clients/deterministic-agent-workflow-cli/define-workflow-routes'
import { ZodSchemaProvider } from '../../../infra/external-clients/zod/zod-schema-provider'
import { configureWorkflow } from './configure-workflow'
import type { Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { CreateWorkflowRoutes, type CreateWorkflowRoutesInput } from './create-workflow-routes'

const workflowResult: ReturnType<Workflow['executeRecording']> = { pass: true }

class UnexpectedRouteError extends Error {}

function createInput(): CreateWorkflowRoutesInput {
  return {
    parseNumberArgument: () => 1,
    parseStringArgument: () => 'value',
    parseOptionalStringArgument: () => undefined,
    parseStringArguments: () => [],
    recordIssue: () => workflowResult,
    recordBranch: () => workflowResult,
    recordPullRequest: () => workflowResult,
    createPullRequest: () => workflowResult,
    recordCiPassed: () => workflowResult,
    recordCiFailed: () => workflowResult,
    verifyFeedbackAddressed: () => workflowResult,
  }
}

function createWorkflow() {
  const definition = configureWorkflow({})
  return definition.buildWorkflow(definition.initialState(), {
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
  })
}

describe('CreateWorkflowRoutes', () => {
  it('creates the complete workflow route map', () => {
    const stateSchema = z.enum(['IMPLEMENTING', 'REVIEWING', 'COMPLETE', 'BLOCKED'])
    const createWorkflowRoutes = new CreateWorkflowRoutes(
      new ZodSchemaProvider(stateSchema),
      defineWorkflowRoutes,
    )

    const { routes } = createWorkflowRoutes.execute(createInput())

    expect(Object.keys(routes)).toStrictEqual([
      'init',
      'transition',
      'record-issue',
      'record-branch',
      'record-pr',
      'create-pr',
      'record-ci-passed',
      'record-ci-failed',
      'verify-feedback-addressed',
    ])

    const workflow = createWorkflow()
    const transaction = (name: string) => {
      const route = routes[name]
      if (route?.type !== 'transaction') {
        throw new UnexpectedRouteError(`Expected transaction route: ${name}`)
      }
      return route.handler
    }

    transaction('record-issue')(workflow, 1)
    transaction('record-branch')(workflow, 'branch')
    transaction('record-pr')(workflow, 1, undefined)
    transaction('create-pr')(workflow, [])
    transaction('record-ci-passed')(workflow)
    transaction('record-ci-failed')(workflow, 'output')
    transaction('verify-feedback-addressed')(workflow)
  })
})
