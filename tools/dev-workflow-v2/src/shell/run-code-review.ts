import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PlatformContext, ReviewAgentClient } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import { ReviewCoordinator } from '@nt-ai-lab/deterministic-agent-workflow-cli'
import type { ReviewBundleRequest, ReviewJobStore } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import { reduceWorkflowStateFromStoredEvents } from '@nt-ai-lab/deterministic-agent-workflow-engine'
import type { ReviewerDefinition } from '@living-architecture/dev-workflow-v2-domain-model/domain/reviewer-definitions'
import type { ConfigureWorkflowResult } from '@living-architecture/dev-workflow-v2-use-cases/commands/configure-workflow'
import { readGitRepositoryStatus } from '@living-architecture/dev-workflow-v2-use-cases/external-clients/git/git-client'

/** @riviere-role value-object */
export type RunCodeReviewDeps = {
  readonly getWorkflowDefinition: () => ConfigureWorkflowResult
  readonly getPlatform: () => PlatformContext
  readonly pluginRoot: string
  readonly acpClient: ReviewAgentClient
}

/**
 * Builds the runCodeReview handler that auto-launches the ACP review bundle when
 * the workflow enters REVIEWING. It rehydrates the workflow state from the event
 * store, reads the persisted PR snapshot, and fires the coordinator.
 */
export function createRunCodeReview(deps: RunCodeReviewDeps): (reviewers: readonly ReviewerDefinition[]) => void {
  return (reviewers) => {
    const platform = deps.getPlatform()
    const definition = deps.getWorkflowDefinition()
    const state = reduceWorkflowStateFromStoredEvents(
      definition,
      platform.store.readEvents(platform.getSessionId()),
    )
    const snapshot = state.pullRequestSnapshot
    if (snapshot === undefined) {
      return
    }
    const repositoryStatus = readGitRepositoryStatus()
    const request: ReviewBundleRequest = {
      bundleId: `review-${snapshot.repository}-${snapshot.prNumber}`,
      sessionId: platform.getSessionId(),
      repository: snapshot.repository,
      workingDirectory: process.cwd(),
      pullRequestNumber: snapshot.prNumber,
      baseRevision: snapshot.baseRevision,
      headRevision: snapshot.headRevision,
      changedFiles: [...repositoryStatus.changedFilesVsDefault],
      stateInstructions: readFileSync(join(deps.pluginRoot, 'states', 'reviewing.md'), 'utf8'),
      reviews: reviewers.map((reviewer) => ({
        reviewType: reviewer.reviewType,
        instructions: readFileSync(join(deps.pluginRoot, reviewer.agentInstructions), 'utf8'),
        version: reviewer.version,
      })),
    }
    const coordinator = new ReviewCoordinator({
      // TEMPORARY: PlatformContext conflates the workflow store and the review
      // job store into one field typed WorkflowEventStore. The library team is
      // fixing this (bug report raised). Remove the cast once the platform
      // exposes a ReviewJobStore separately.
      store: platform.store as unknown as ReviewJobStore,
      client: deps.acpClient,
      now: platform.now,
    })
    void coordinator.run(request, 'REVIEWING')
  }
}
