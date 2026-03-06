import type { WorkflowEngine } from '@ntcoding/agentic-workflow-builder/engine'
import type {
  Workflow, WorkflowDeps 
} from '../../workflow-definition/domain/workflow'
import type { WorkflowState } from '../../workflow-definition/domain/workflow-types'
import { STATE_NAME_SCHEMA } from '../../workflow-definition/domain/workflow-types'
import { EXIT_ERROR } from './hook-io'
import type { AdapterDeps } from '../../shell/composition-root'
import type { OperationResult } from './operation-result'
import { toOperationResult } from './operation-result'

type WorkflowEngineInstance = WorkflowEngine<Workflow, WorkflowState, WorkflowDeps>

export type CommandHandler = (
  args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
) => OperationResult

export function handleInit(
  _args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  return toOperationResult(engine.startSession(deps.getSessionId()))
}

export function handleTransition(
  args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  const rawState = args[1]
  if (!rawState) {
    return {
      output: 'transition: missing required argument <STATE>',
      exitCode: EXIT_ERROR,
    }
  }
  const parseResult = STATE_NAME_SCHEMA.safeParse(rawState)
  if (!parseResult.success) {
    return {
      output: `transition: invalid state '${rawState}'`,
      exitCode: EXIT_ERROR,
    }
  }
  return toOperationResult(engine.transition(deps.getSessionId(), parseResult.data))
}

export function handleRecordIssue(
  args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  const rawNumber = args[1]
  if (!rawNumber) {
    return {
      output: 'record-issue: missing required argument <number>',
      exitCode: EXIT_ERROR,
    }
  }
  const issueNumber = Number.parseInt(rawNumber, 10)
  if (Number.isNaN(issueNumber)) {
    return {
      output: `record-issue: not a valid number: '${rawNumber}'`,
      exitCode: EXIT_ERROR,
    }
  }
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-issue', (w) => w.recordIssue(issueNumber)),
  )
}

export function handleRecordBranch(
  args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  const branch = args[1]
  if (!branch) {
    return {
      output: 'record-branch: missing required argument <branch>',
      exitCode: EXIT_ERROR,
    }
  }
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-branch', (w) => w.recordBranch(branch)),
  )
}

export function handleRecordVerifyPassed(
  _args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-verify-passed', (w) => w.recordVerifyPassed()),
  )
}

export function handleRecordVerifyFailed(
  args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  const output = args[1]
  if (!output) {
    return {
      output: 'record-verify-failed: missing required argument <output>',
      exitCode: EXIT_ERROR,
    }
  }
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-verify-failed', (w) =>
      w.recordVerifyFailed(output),
    ),
  )
}

export function handleRecordReviewPassed(
  _args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-review-passed', (w) => w.recordReviewPassed()),
  )
}

export function handleRecordReviewFailed(
  args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  const reviewers = args.slice(1)
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-review-failed', (w) =>
      w.recordReviewFailed(reviewers),
    ),
  )
}

export function handleRecordPr(
  args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  const rawNumber = args[1]
  if (!rawNumber) {
    return {
      output: 'record-pr: missing required argument <number>',
      exitCode: EXIT_ERROR,
    }
  }
  const prNumber = Number.parseInt(rawNumber, 10)
  if (Number.isNaN(prNumber)) {
    return {
      output: `record-pr: not a valid number: '${rawNumber}'`,
      exitCode: EXIT_ERROR,
    }
  }
  const prUrl = args[2]
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-pr', (w) => w.recordPr(prNumber, prUrl)),
  )
}

export function handleRecordCiPassed(
  _args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-ci-passed', (w) => w.recordCiPassed()),
  )
}

export function handleRecordCiFailed(
  args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  const output = args[1]
  if (!output) {
    return {
      output: 'record-ci-failed: missing required argument <output>',
      exitCode: EXIT_ERROR,
    }
  }
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-ci-failed', (w) => w.recordCiFailed(output)),
  )
}

export function handleRecordFeedbackClean(
  _args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-feedback-clean', (w) =>
      w.recordFeedbackClean(),
    ),
  )
}

export function handleRecordFeedbackExists(
  args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  const rawCount = args[1]
  if (!rawCount) {
    return {
      output: 'record-feedback-exists: missing required argument <count>',
      exitCode: EXIT_ERROR,
    }
  }
  const count = Number.parseInt(rawCount, 10)
  if (Number.isNaN(count)) {
    return {
      output: `record-feedback-exists: not a valid number: '${rawCount}'`,
      exitCode: EXIT_ERROR,
    }
  }
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-feedback-exists', (w) =>
      w.recordFeedbackExists(count),
    ),
  )
}

export function handleRecordFeedbackAddressed(
  _args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-feedback-addressed', (w) =>
      w.recordFeedbackAddressed(),
    ),
  )
}

export function handleRecordReflection(
  args: readonly string[],
  engine: WorkflowEngineInstance,
  deps: AdapterDeps,
): OperationResult {
  const path = args[1]
  if (!path) {
    return {
      output: 'record-reflection: missing required argument <path>',
      exitCode: EXIT_ERROR,
    }
  }
  return toOperationResult(
    engine.transaction(deps.getSessionId(), 'record-reflection', (w) => w.recordReflection(path)),
  )
}
