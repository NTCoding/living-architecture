import { WorkflowStateError } from '@ntcoding/agentic-workflow-builder/engine'
import type {
  WorkflowState, WorkflowOperation 
} from '../domain/workflow-types'

const CMD = '/dev-workflow-v2:workflow'

function requireField<T>(value: T | undefined, fieldName: string): T {
  if (value === undefined) throw new WorkflowStateError(`Expected '${fieldName}' to be set`)
  return value
}

type OperationBodyFn = (state: WorkflowState) => string

const OPERATION_BODIES: Readonly<Record<string, OperationBodyFn | undefined>> = {
  'record-issue': (s) => `GitHub issue #${requireField(s.githubIssue, 'githubIssue')} recorded.`,
  'record-branch': (s) =>
    `Feature branch '${requireField(s.featureBranch, 'featureBranch')}' recorded.`,
  'record-verify-passed': () => `Verify passed.\n\n  ${CMD} transition REVIEWING`,
  'record-verify-failed': () => `Verify failed.\n\n  ${CMD} transition IMPLEMENTING`,
  'record-review-passed': () => `Review passed.\n\n  ${CMD} transition SUBMITTING_PR`,
  'record-review-failed': () => `Review failed.\n\n  ${CMD} transition IMPLEMENTING`,
  'record-pr': (s) =>
    `PR #${requireField(s.prNumber, 'prNumber')} recorded.\n\n  ${CMD} transition AWAITING_CI`,
  'record-ci-passed': () => `CI passed.\n\n  ${CMD} transition CHECKING_FEEDBACK`,
  'record-ci-failed': () => `CI failed.\n\n  ${CMD} transition IMPLEMENTING`,
  'record-feedback-clean': () => `Feedback clean.\n\n  ${CMD} transition REFLECTING`,
  'record-feedback-exists': () => `Feedback exists.\n\n  ${CMD} transition ADDRESSING_FEEDBACK`,
  'record-feedback-addressed': () => `Feedback addressed.\n\n  ${CMD} transition VERIFYING`,
  'record-reflection': () => `Reflection written.\n\n  ${CMD} transition COMPLETE`,
} satisfies Record<WorkflowOperation, OperationBodyFn>

export function getOperationBody(op: string, state: WorkflowState): string {
  const bodyFn = OPERATION_BODIES[op]
  /* v8 ignore next */
  if (!bodyFn) return op
  return bodyFn(state)
}

export function getTransitionTitle(to: string, _state: WorkflowState): string {
  return to
}
