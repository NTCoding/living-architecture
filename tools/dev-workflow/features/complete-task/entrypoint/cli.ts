#!/usr/bin/env tsx
import { runWorkflow } from '../../../platform/domain/workflow-execution/run-workflow'
import type { WorkflowResult } from '../../../platform/domain/workflow-execution/workflow-runner'
import { buildCompleteTaskContext } from '../use-cases/complete-task'
import { type CompleteTaskContext } from '../domain/task-to-complete'
import { formatCompleteTaskResult } from '../domain/pipeline-outcome'
import { verifyBuild } from '../domain/steps/verify-build'
import { codeReview } from '../domain/steps/run-code-review'
import { submitPR } from '../domain/steps/submit-pull-request'
import { fetchPRFeedback } from '../domain/steps/fetch-feedback'

runWorkflow<CompleteTaskContext>(
  [verifyBuild, codeReview, submitPR, fetchPRFeedback],
  buildCompleteTaskContext,
  (result: WorkflowResult, ctx: CompleteTaskContext) => formatCompleteTaskResult(result, ctx),
)
