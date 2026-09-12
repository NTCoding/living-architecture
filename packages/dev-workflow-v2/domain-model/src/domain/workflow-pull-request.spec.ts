import { assert } from 'vitest'
import { buildTestWorkflow, makeDeps } from './__fixtures__/workflow-test-fixtures'
import type { CreateWorkflowPullRequest } from './ports/create-pull-request'
import {
  CommitType,
  PullRequestCreationDetails,
  PullRequestDescription,
  PullRequestTitle,
} from './pull-request-description'
import { WorkflowState } from './workflow-types'
class GitHubPullRequestError extends Error {}
const commitType = CommitType.from('feat')
const title = PullRequestTitle.from('restore agent drafted pull requests')
const description = PullRequestDescription.from(
  'The workflow now restores the agent drafted pull request description so the submitted pull request explains the completed work clearly.',
)
assert(commitType.ok)
assert(title.ok)
assert(description.ok)
const VALID_PULL_REQUEST_DESCRIPTION_INPUT = PullRequestCreationDetails.from({
  commitType: commitType.value,
  commitScope: 'workflow',
  title: title.value,
  description: description.value,
  problem: 'Fixed pull request metadata did not explain the completed work.',
  acceptanceCriteria: '- Pull requests include the drafted workflow description.',
  keyChanges: '- Restore structured pull request creation.',
  architectureImpact: 'None.',
  validation: '- pnpm nx test dev-workflow-v2-domain-model',
  notes: 'None.',
})
describe('pull request creation', () => {
  it('rejects create-pr while still implementing with the operation gate reason', () => {
    const workflow = buildTestWorkflow(
      makeDeps({
        createPullRequest: () => ({ prNumber: 11, prUrl: 'https://example.test/pull/11' }),
      }),
    )
    expect(workflow.createPr(VALID_PULL_REQUEST_DESCRIPTION_INPUT)).toStrictEqual({
      pass: false,
      reason: 'create-pr is not allowed in state IMPLEMENTING.',
    })
  })
  it('records a structured ready pull request when the submission details and description are valid', () => {
    const workflow = buildTestWorkflow(
      makeDeps({
        createPullRequest: () => ({ prNumber: 11, prUrl: 'https://example.test/pull/11' }),
      }),
    )
    workflow.executeRecording('record-issue', 42)
    workflow.executeRecording('record-branch', 'issue-42')
    workflow.transition('SUBMITTING_PR')
    const result = workflow.createPr(VALID_PULL_REQUEST_DESCRIPTION_INPUT)
    expect(result).toStrictEqual({ pass: true })
    expect(workflow.getState()).toMatchObject({
      prNumber: 11,
      prUrl: 'https://example.test/pull/11',
    })
  })
  it('builds a structured pull request body with the linked issue and branch', () => {
    const requests: Parameters<CreateWorkflowPullRequest>[0][] = []
    const workflow = buildTestWorkflow(
      makeDeps({
        createPullRequest: (creationRequest) => {
          requests.push(creationRequest)
          return { prNumber: 11, prUrl: 'https://example.test/pull/11' }
        },
      }),
    )
    workflow.executeRecording('record-issue', 42)
    workflow.executeRecording('record-branch', 'issue-42')
    workflow.transition('SUBMITTING_PR')
    workflow.createPr(VALID_PULL_REQUEST_DESCRIPTION_INPUT)

    expect(requests[0]).toStrictEqual({
      branch: 'issue-42',
      title: 'feat(workflow): restore agent drafted pull requests',
      body: [
        '## Description\n\nThe workflow now restores the agent drafted pull request description so the submitted pull request explains the completed work clearly.',
        '## Linked Issue\n\nCloses #42',
        '## What Problem Does This PR Solve?\n\nFixed pull request metadata did not explain the completed work.',
        '## Acceptance Criteria\n\n- Pull requests include the drafted workflow description.',
        '## Key Changes\n\n- Restore structured pull request creation.',
        '## Notable Architectural Changes / Impact\n\nNone.',
        '## Validation\n\n- pnpm nx test dev-workflow-v2-domain-model',
        '## Notes\n\nNone.',
      ].join('\n\n'),
    })
  })
  it('rejects a second pull request once one has been recorded', () => {
    const workflow = buildTestWorkflow(
      makeDeps({
        createPullRequest: () => ({ prNumber: 11, prUrl: 'https://example.test/pull/11' }),
      }),
    )
    workflow.executeRecording('record-issue', 42)
    workflow.executeRecording('record-branch', 'issue-42')
    workflow.transition('SUBMITTING_PR')
    expect(workflow.createPr(VALID_PULL_REQUEST_DESCRIPTION_INPUT)).toStrictEqual({ pass: true })

    expect(workflow.createPr(VALID_PULL_REQUEST_DESCRIPTION_INPUT)).toStrictEqual({
      pass: false,
      reason: 'A pull request has already been recorded for this workflow.',
    })
  })
  it('rejects re-entering SUBMITTING_PR after a pull request has been recorded', () => {
    const workflow = buildTestWorkflow(
      makeDeps(),
      WorkflowState.initial().with({
        currentStateMachineState: 'IMPLEMENTING',
        githubIssue: 42,
        featureBranch: 'issue-42',
        prNumber: 11,
        prUrl: 'https://example.test/pull/11',
      }),
    )

    expect(workflow.transition('SUBMITTING_PR')).toStrictEqual({
      pass: false,
      reason: 'A pull request has already been recorded. Submitting another is not allowed.',
    })
  })
  it('rejects transitioning to SUBMITTING_PR without a recorded branch', () => {
    const workflow = buildTestWorkflow(makeDeps())
    workflow.executeRecording('record-issue', 42)

    expect(workflow.transition('SUBMITTING_PR')).toStrictEqual({
      pass: false,
      reason: 'No branch recorded. Run record-branch first.',
    })
  })
  it('returns the GitHub error when pull request creation fails', () => {
    const workflow = buildTestWorkflow(
      makeDeps({
        createPullRequest: () => {
          throw new GitHubPullRequestError('GitHub rejected the request')
        },
      }),
    )
    workflow.executeRecording('record-issue', 42)
    workflow.executeRecording('record-branch', 'issue-42')
    workflow.transition('SUBMITTING_PR')
    const result = workflow.createPr(VALID_PULL_REQUEST_DESCRIPTION_INPUT)
    expect(result).toStrictEqual({
      pass: false,
      reason: 'Unable to create PR: Error: GitHub rejected the request',
    })
  })
})
