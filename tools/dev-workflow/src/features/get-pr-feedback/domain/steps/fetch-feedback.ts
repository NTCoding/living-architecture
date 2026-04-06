import type { Step } from '../../../../platform/domain/workflow-execution/workflow-runner'
import { success } from '../../../../platform/domain/workflow-execution/step-result'
import {
  getPRFeedback,
  type FetchRawPRFeedback,
} from '../../../../platform/domain/review-feedback/get-pr-feedback'
import type {
  GetPRFeedbackContext, PRFeedbackStatus, CheckRunSummary 
} from '../feedback-report'
import type { ReviewDecision } from '../../../../platform/domain/review-feedback/review-decision'

interface PRMergeInfo {
  mergeableState: string
  headSha: string
}

interface CheckRun {
  name: string
  status: string
  conclusion: string | null
}

/** @riviere-role value-object */
export interface FetchFeedbackDeps {
  getPRMergeInfo: (prNumber: number) => Promise<PRMergeInfo>
  listCheckRuns: (ref: string) => Promise<CheckRun[]>
  fetchRawPRFeedback: FetchRawPRFeedback
}

async function getFailedChecks(
  deps: FetchFeedbackDeps,
  headSha: string,
): Promise<CheckRunSummary[]> {
  const checkRuns = await deps.listCheckRuns(headSha)
  return checkRuns
    .filter((run) => run.conclusion !== 'success' && run.conclusion !== 'skipped')
    .map((run) => ({
      name: run.name,
      conclusion: run.conclusion,
    }))
}

function hasNoChangesRequested(decisions: ReviewDecision[]): boolean {
  return !decisions.some((d) => d.state === 'CHANGES_REQUESTED')
}

function buildEmptyStatus(
  branch: string,
  state: PRFeedbackStatus['state'],
  ctx?: {
    prNumber?: number
    prUrl?: string
  },
): PRFeedbackStatus {
  return {
    branch,
    state,
    prNumber: ctx?.prNumber,
    prUrl: ctx?.prUrl,
    mergeableState: null,
    reviewDecisions: [],
    mergeable: false,
    feedback: [],
    feedbackCount: 0,
  }
}

function buildBatchInstruction(feedbackCount: number): string | undefined {
  return feedbackCount > 1
    ? `Fix ALL ${feedbackCount} feedback items in a single commit. Do not fix-commit-wait in a loop.`
    : undefined
}

async function fetchOpenPRStatus(
  deps: FetchFeedbackDeps,
  ctx: GetPRFeedbackContext & {
    prNumber: number
    prState: NonNullable<GetPRFeedbackContext['prState']>
  },
  isMergedOrClosed: boolean,
): Promise<PRFeedbackStatus> {
  const prFeedback = await getPRFeedback(deps.fetchRawPRFeedback, ctx.prNumber, {includeResolved: ctx.includeResolved,})
  const mergeInfo = isMergedOrClosed ? null : await deps.getPRMergeInfo(ctx.prNumber)
  const mergeableState = mergeInfo?.mergeableState ?? null

  const failedChecks =
    mergeableState !== null && mergeableState !== 'clean' && mergeInfo
      ? await getFailedChecks(deps, mergeInfo.headSha)
      : undefined

  const isMergeable =
    mergeableState === 'clean' &&
    prFeedback.threads.length === 0 &&
    hasNoChangesRequested(prFeedback.reviewDecisions)

  const feedbackCount = prFeedback.threads.length
  const instruction = buildBatchInstruction(feedbackCount)

  return {
    branch: ctx.branch,
    state: ctx.prState,
    prNumber: ctx.prNumber,
    prUrl: ctx.prUrl,
    mergeableState,
    reviewDecisions: prFeedback.reviewDecisions,
    mergeable: isMergeable,
    ...(failedChecks && { failedChecks }),
    feedback: prFeedback.threads,
    feedbackCount,
    ...(instruction && { instruction }),
  }
}

/** @riviere-role domain-service */
export function createFetchFeedbackStep(deps: FetchFeedbackDeps): Step<GetPRFeedbackContext> {
  return {
    name: 'fetch-feedback',
    execute: async (ctx) => {
      if (!ctx.prNumber || !ctx.prState) {
        return success(buildEmptyStatus(ctx.branch, 'not_found'))
      }

      const isMergedOrClosed = ctx.prState === 'merged' || ctx.prState === 'closed'

      if (isMergedOrClosed && !ctx.includeResolved) {
        return success(buildEmptyStatus(ctx.branch, ctx.prState, ctx))
      }

      const status = await fetchOpenPRStatus(
        deps,
        {
          ...ctx,
          prNumber: ctx.prNumber,
          prState: ctx.prState,
        },
        isMergedOrClosed,
      )
      return success(status)
    },
  }
}
