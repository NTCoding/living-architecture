import { appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { WorkflowEngine } from '@ntcoding/agentic-workflow-builder/engine'
import { WORKFLOW_ADAPTER } from '../workflow-definition/infra/workflow-adapter'
import type { AdapterDeps } from '../shell/composition-root'
import { buildRealDeps } from '../shell/composition-root'
import { EXIT_ERROR } from '../infra/cli/hook-io'
import { getErrorLogPath } from '../infra/cli/environment'
import type { OperationResult } from '../infra/cli/operation-result'
import type { CommandHandler } from '../infra/cli/command-handlers'
import {
  handleInit,
  handleTransition,
  handleRecordIssue,
  handleRecordBranch,
  handleRecordArchitectureReviewPassed,
  handleRecordArchitectureReviewFailed,
  handleRecordCodeReviewPassed,
  handleRecordCodeReviewFailed,
  handleRecordBugScannerPassed,
  handleRecordBugScannerFailed,
  handleRecordTaskCheckPassed,
  handleRecordPr,
  handleRecordCiPassed,
  handleRecordCiFailed,
  handleRecordFeedbackClean,
  handleRecordFeedbackExists,
  handleRecordFeedbackAddressed,
  handleRecordReflection,
} from '../infra/cli/command-handlers'
import { routeHookEvent } from '../infra/cli/hook-handlers'

const COMMAND_HANDLERS: Readonly<Record<string, CommandHandler>> = {
  init: handleInit,
  transition: handleTransition,
  'record-issue': handleRecordIssue,
  'record-branch': handleRecordBranch,
  'record-architecture-review-passed': handleRecordArchitectureReviewPassed,
  'record-architecture-review-failed': handleRecordArchitectureReviewFailed,
  'record-code-review-passed': handleRecordCodeReviewPassed,
  'record-code-review-failed': handleRecordCodeReviewFailed,
  'record-bug-scanner-passed': handleRecordBugScannerPassed,
  'record-bug-scanner-failed': handleRecordBugScannerFailed,
  'record-task-check-passed': handleRecordTaskCheckPassed,
  'record-pr': handleRecordPr,
  'record-ci-passed': handleRecordCiPassed,
  'record-ci-failed': handleRecordCiFailed,
  'record-feedback-clean': handleRecordFeedbackClean,
  'record-feedback-exists': handleRecordFeedbackExists,
  'record-feedback-addressed': handleRecordFeedbackAddressed,
  'record-reflection': handleRecordReflection,
}

export function runWorkflow(args: readonly string[], deps: AdapterDeps): OperationResult {
  const engine = new WorkflowEngine(WORKFLOW_ADAPTER, deps.engineDeps, deps.workflowDeps)
  const command = args[0]
  if (!command) {
    return routeHookEvent(engine, deps)
  }
  const handler = COMMAND_HANDLERS[command]
  if (!handler) {
    return {
      output: `Unknown command: ${command}`,
      exitCode: EXIT_ERROR,
    }
  }
  return handler(args, engine, deps)
}

/* v8 ignore start */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = runWorkflow(process.argv.slice(2), buildRealDeps())
    process.stdout.write(result.output, () => process.exit(result.exitCode))
  } catch (error) {
    const message = `[${new Date().toISOString()}] HOOK ERROR: ${String(error)}\n`
    process.stderr.write(message)
    appendFileSync(getErrorLogPath(), message)
    process.exit(EXIT_ERROR)
  }
}
/* v8 ignore stop */
