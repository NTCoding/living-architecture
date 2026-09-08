import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PlatformContext } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { ReviewPayload } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { reduceWorkflowStateFromStoredEvents } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type {
  ConfigureWorkflowInput,
  ConfigureWorkflowResult,
} from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import {
  createSessionReviewRecordedEvent,
  listSessionReviewRecords,
} from '@living-architecture/dev-workflow-v2-use-cases/queries/session-review-records'
import { readGitRepositoryStatus } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/git/git-client'

type PullRequestSnapshot = {
  readonly repository: string
  readonly issue: number
  readonly branch: string
  readonly prNumber: number
  readonly baseRevision: string
  readonly headRevision: string
}

type AcpReviewLaunch = {
  readonly reviewType: string
  readonly prompt: string
  readonly workingDirectory: string
  readonly attemptId: string
  readonly reviewerDefinitionVersion: string
}

type AcpReviewRunner = (launch: AcpReviewLaunch) => Promise<{
  readonly payload: ReviewPayload
  readonly providerSessionId: string
}>

type RunReviewsDeps = {
  readonly platform: PlatformContext
  readonly snapshot: PullRequestSnapshot
  readonly changedFiles: readonly string[]
  readonly launches: readonly AcpReviewLaunch[]
  readonly runReviewer: AcpReviewRunner
}

/** @riviere-role main */
export function createRunCodeReview(deps: {
  readonly getWorkflowDefinition: () => ConfigureWorkflowResult
  readonly getPlatform: () => PlatformContext
  readonly pluginRoot: string
  readonly runReviewer: AcpReviewRunner
}): ConfigureWorkflowInput['runCodeReview'] {
  return (reviewers) => {
    const platform = deps.getPlatform()
    const definition = deps.getWorkflowDefinition()
    const state = reduceWorkflowStateFromStoredEvents(
      definition,
      platform.workflowEventStore.readEvents(platform.getSessionId()),
    )
    const snapshot = state.pullRequestSnapshot
    if (snapshot === undefined) {
      return
    }
    const pendingReviewers = definition.pendingReviewers(reviewers, state)
    if (pendingReviewers.length === 0) {
      return
    }
    const changedFiles = [...readGitRepositoryStatus().changedFilesVsDefault]
    const launches = pendingReviewers.map((reviewer) => ({
      reviewType: reviewer.reviewType,
      prompt: buildReviewPrompt({
        reviewerInstructions: readFileSync(
          join(deps.pluginRoot, reviewer.agentInstructions),
          'utf8',
        ),
        repository: snapshot.repository,
        issue: snapshot.issue,
        pullRequestNumber: snapshot.prNumber,
        baseRevision: snapshot.baseRevision,
        headRevision: snapshot.headRevision,
        changedFiles,
      }),
      workingDirectory: process.cwd(),
      attemptId: buildAttemptId(snapshot, reviewer.reviewType),
      reviewerDefinitionVersion: reviewer.version,
    }))
    void runReviews({
      platform,
      snapshot,
      changedFiles,
      launches,
      runReviewer: deps.runReviewer,
    }).catch((error) => {
      console.error('[dev-workflow-v2] runReviews failed:', error)
    })
  }
}

async function runReviews(deps: RunReviewsDeps): Promise<void> {
  const outcomes = await Promise.allSettled(deps.launches.map((launch) => deps.runReviewer(launch)))
  const firstReviewId =
    listSessionReviewRecords(
      deps.platform.workflowEventStore.readEvents(deps.platform.getSessionId()),
    ).length + 1
  for (const [index, outcome] of outcomes.entries()) {
    const launch = deps.launches[index]
    if (launch === undefined) continue
    if (outcome.status === 'fulfilled') {
      recordReview(
        deps,
        launch,
        firstReviewId + index,
        outcome.value.payload,
        outcome.value.providerSessionId,
      )
    } else {
      recordReviewFailure(deps, launch, firstReviewId + index, describeError(outcome.reason))
    }
  }
}

function recordReview(
  deps: RunReviewsDeps,
  launch: AcpReviewLaunch,
  reviewId: number,
  payload: ReviewPayload,
  providerSessionId: string,
): void {
  appendReviewRecord(deps, {
    reviewId,
    createdAt: deps.platform.now(),
    reviewType: launch.reviewType,
    verdict: payload.verdict,
    findings: payload.findings,
    ...(payload.summary === undefined ? {} : { summary: payload.summary }),
    branch: deps.snapshot.branch,
    pullRequestNumber: deps.snapshot.prNumber,
    completionProvenance: buildCompletionProvenance(deps, launch, providerSessionId),
  })
}

function recordReviewFailure(
  deps: RunReviewsDeps,
  launch: AcpReviewLaunch,
  reviewId: number,
  reason: string,
): void {
  appendReviewRecord(deps, {
    reviewId,
    createdAt: deps.platform.now(),
    reviewType: launch.reviewType,
    verdict: 'FAIL',
    findings: [
      {
        status: 'blocking',
        title: 'Review infrastructure failure',
        details: reason,
        recommendation: 'Transition to BLOCKED and report the exact failure to the user.',
      },
    ],
    summary: 'Review infrastructure failure: the review did not run.',
    branch: deps.snapshot.branch,
    pullRequestNumber: deps.snapshot.prNumber,
    completionProvenance: buildCompletionProvenance(deps, launch, 'unavailable'),
  })
  console.error(`[dev-workflow-v2] Review infrastructure failure (${launch.reviewType}): ${reason}`)
}

function appendReviewRecord(deps: RunReviewsDeps, record: Record<string, unknown>): void {
  deps.platform.workflowEventStore.appendEvents(deps.platform.getSessionId(), [
    createSessionReviewRecordedEvent(record, 'REVIEWING'),
  ])
}

function buildCompletionProvenance(
  deps: RunReviewsDeps,
  launch: AcpReviewLaunch,
  providerSessionId: string,
) {
  return {
    bundleId: `review-${deps.snapshot.repository}-${deps.snapshot.prNumber}`,
    providerSessionId,
    providerRunId: launch.attemptId,
    baseRevision: deps.snapshot.baseRevision,
    headRevision: deps.snapshot.headRevision,
    exactFilesDigest: buildExactFilesDigest(deps.changedFiles),
    exactFiles: [...deps.changedFiles],
    reviewerDefinitionVersion: launch.reviewerDefinitionVersion,
  }
}

function buildReviewPrompt(input: {
  readonly reviewerInstructions: string
  readonly repository: string
  readonly issue: number
  readonly pullRequestNumber: number
  readonly baseRevision: string
  readonly headRevision: string
  readonly changedFiles: readonly string[]
}): string {
  const files = input.changedFiles.map((file) => `- ${file}`).join('\n')
  return [
    `You are reviewing pull request #${String(input.pullRequestNumber)} in ${input.repository}.`,
    `Issue: ${String(input.issue)}`,
    `Base revision: ${input.baseRevision}`,
    `Head revision: ${input.headRevision}`,
    '',
    'Files to Review:',
    files,
    '',
    input.reviewerInstructions,
  ].join('\n')
}

function buildAttemptId(snapshot: PullRequestSnapshot, reviewType: string): string {
  return `review-${snapshot.repository}-${snapshot.prNumber}-${reviewType}-${Date.now()}`
}

function buildExactFilesDigest(changedFiles: readonly string[]): string {
  return createHash('sha256').update(changedFiles.join('\n')).digest('hex')
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
