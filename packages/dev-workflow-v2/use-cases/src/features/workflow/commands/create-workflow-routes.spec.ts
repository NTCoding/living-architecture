import { makeWorkflowDeps } from './__fixtures__/workflow-dependencies'
import { defineWorkflowRoutes } from '../../../infra/external-clients/deterministic-agent-workflow-cli/define-workflow-routes'
import { ZodSchemaProvider } from '../../../infra/external-clients/zod/zod-schema-provider'
import { configureWorkflow } from './configure-workflow'
import type { MaintainerWorkflow as Workflow } from '@living-architecture/dev-workflow-v2-domain-model/domain/workflow'
import { describe, expect, it, vi } from 'vitest'
import {
  CreateWorkflowRoutes,
  type CreateWorkflowRoutesInput,
  type CreateWorkflowRoutesResult,
} from './create-workflow-routes'

const workflowResult: ReturnType<Workflow['executeRecording']> = { pass: true }

class UnexpectedRouteError extends Error {}

interface RouteCalls {
  recordIssue: unknown[][]
  recordBranch: unknown[][]
  recordPullRequest: unknown[][]
  createPullRequest: unknown[][]
  recordCiPassed: unknown[][]
  recordCiFailed: unknown[][]
  verifyFeedbackAddressed: unknown[][]
  verifyPrReviewGate: unknown[][]
}

function createInput(): {
  input: CreateWorkflowRoutesInput
  calls: RouteCalls
} {
  const calls: RouteCalls = {
    recordIssue: [],
    recordBranch: [],
    recordPullRequest: [],
    createPullRequest: [],
    recordCiPassed: [],
    recordCiFailed: [],
    verifyFeedbackAddressed: [],
    verifyPrReviewGate: [],
  }
  return {
    input: {
      parseNumberArgument: vi.fn(() => 1),
      parseStringArgument: vi.fn(() => 'value'),
      parseOptionalStringArgument: vi.fn(() => undefined),
      parseStringArguments: vi.fn(() => []),
      recordIssue: (workflow, issueNumber) => {
        calls.recordIssue.push([workflow, issueNumber])
        return workflowResult
      },
      recordBranch: (workflow, branch) => {
        calls.recordBranch.push([workflow, branch])
        return workflowResult
      },
      recordPullRequest: (workflow, number, url) => {
        calls.recordPullRequest.push([workflow, number, url])
        return workflowResult
      },
      createPullRequest: (workflow, args) => {
        calls.createPullRequest.push([workflow, args])
        return workflowResult
      },
      recordCiPassed: (workflow) => {
        calls.recordCiPassed.push([workflow])
        return workflowResult
      },
      recordCiFailed: (workflow, output) => {
        calls.recordCiFailed.push([workflow, output])
        return workflowResult
      },
      verifyLocal: (workflow) => workflow.verifyLocal(),
      verifyFeedbackAddressed: (workflow) => {
        calls.verifyFeedbackAddressed.push([workflow])
        return workflowResult
      },
      verifyPrReviewGate: (workflow) => {
        calls.verifyPrReviewGate.push([workflow])
        return workflowResult
      },
    },
    calls,
  }
}

function createWorkflow(definition: ReturnType<typeof configureWorkflow>) {
  return definition.buildWorkflow(definition.initialState(), makeWorkflowDeps())
}

function transactionHandler(routes: CreateWorkflowRoutesResult['routes'], name: string) {
  const route = routes[name]
  if (route?.type !== 'transaction') {
    throw new UnexpectedRouteError(`Expected transaction route: ${name}`)
  }
  return route.handler
}

function stateArgument(routes: CreateWorkflowRoutesResult['routes']) {
  const transition = routes['transition']
  if (transition?.type !== 'transition') {
    throw new UnexpectedRouteError('Expected transition route')
  }
  const argument = transition.args?.[0]
  if (!argument) throw new UnexpectedRouteError('Expected state argument')
  return argument
}

describe('CreateWorkflowRoutes', () => {
  it('creates the complete workflow route map', () => {
    const workflowDefinition = configureWorkflow({})
    const createWorkflowRoutes = new CreateWorkflowRoutes(
      new ZodSchemaProvider(workflowDefinition.stateSchema),
      defineWorkflowRoutes,
    )

    const { input } = createInput()
    const { routes } = createWorkflowRoutes.execute(input)

    expect(Object.keys(routes)).toStrictEqual([
      'init',
      'transition',
      'record-issue',
      'record-branch',
      'record-pr',
      'create-pr',
      'record-ci-passed',
      'record-ci-failed',
      'verify-local',
      'verify-feedback-addressed',
      'verify-pr-review-gate',
    ])

    expect(routes['init']).toStrictEqual({ type: 'session-start' })
    expect(routes['transition']?.type).toBe('transition')
  })

  it('binds the authoritative workflow state schema to the transition argument', () => {
    const workflowDefinition = configureWorkflow({})
    const createWorkflowRoutes = new CreateWorkflowRoutes(
      new ZodSchemaProvider(workflowDefinition.stateSchema),
      defineWorkflowRoutes,
    )

    const { input } = createInput()
    const { routes } = createWorkflowRoutes.execute(input)
    const argument = stateArgument(routes)

    expect({
      valid: argument.parse(['IMPLEMENTING'], 0, 'transition'),
      invalid: argument.parse(['NOT_A_STATE'], 0, 'transition').ok,
    }).toStrictEqual({
      valid: {
        ok: true,
        value: 'IMPLEMENTING',
      },
      invalid: false,
    })
  })

  it('delegates every transaction route to its corresponding callback', () => {
    const workflowDefinition = configureWorkflow({})
    const createWorkflowRoutes = new CreateWorkflowRoutes(
      new ZodSchemaProvider(workflowDefinition.stateSchema),
      defineWorkflowRoutes,
    )
    const { input, calls } = createInput()
    const { routes } = createWorkflowRoutes.execute(input)

    const workflow = createWorkflow(workflowDefinition)

    expect(
      transactionHandler(routes, 'verify-local')(workflow, undefined, undefined),
    ).toMatchObject({ pass: false })
    transactionHandler(routes, 'record-issue')(workflow, 1)
    transactionHandler(routes, 'record-branch')(workflow, 'branch')
    transactionHandler(routes, 'record-pr')(workflow, 1, undefined)
    transactionHandler(routes, 'create-pr')(workflow, [])
    transactionHandler(routes, 'record-ci-passed')(workflow, undefined, undefined)
    transactionHandler(routes, 'record-ci-failed')(workflow, 'output')
    transactionHandler(routes, 'verify-feedback-addressed')(workflow, undefined, undefined)
    transactionHandler(routes, 'verify-pr-review-gate')(workflow, undefined, undefined)

    expect({
      recordIssue: calls.recordIssue,
      recordBranch: calls.recordBranch,
      recordPullRequest: calls.recordPullRequest,
      createPullRequest: calls.createPullRequest,
      recordCiPassed: calls.recordCiPassed,
      recordCiFailed: calls.recordCiFailed,
      verifyFeedbackAddressed: calls.verifyFeedbackAddressed,
      verifyPrReviewGate: calls.verifyPrReviewGate,
    }).toStrictEqual({
      recordIssue: [[workflow, 1]],
      recordBranch: [[workflow, 'value']],
      recordPullRequest: [[workflow, 1, undefined]],
      createPullRequest: [[workflow, []]],
      recordCiPassed: [[workflow]],
      recordCiFailed: [[workflow, 'value']],
      verifyFeedbackAddressed: [[workflow]],
      verifyPrReviewGate: [[workflow]],
    })
  })
})
