import type {
  ReviewLaunchRequest,
  ReviewLauncher,
} from '@living-architecture/dev-workflow-v2-domain-model/domain/ports/review-launcher'
import type { AcpClient } from '../../../../infra/external-clients/acp/acp-client'

function buildReviewPrompt(
  request: ReviewLaunchRequest,
  reviewerGuidelines: (reviewer: ReviewLaunchRequest['reviewer']) => string,
): string {
  const { pullRequestNumber, reviewer } = request
  return `${reviewerGuidelines(reviewer)}\n\n## ACP Review Delivery\n\nReview pull request #${String(pullRequestNumber)}. Publish every finding as a GitHub inline pull request comment beginning [${reviewer}]. When every earlier [${reviewer}] comment is resolved and no new finding exists, publish a GitHub pull request comment containing [${reviewer}] APPROVED. Do not return findings or a verdict to the caller.`
}

/** @riviere-role domain-port-adapter */
export function createAcpReviewLauncher(
  acpClient: AcpClient,
  reviewerGuidelines: (reviewer: ReviewLaunchRequest['reviewer']) => string,
): ReviewLauncher {
  return {
    run(requests: readonly ReviewLaunchRequest[]): void {
      acpClient.run(
        requests.map((request) => ({
          prompt: buildReviewPrompt(request, reviewerGuidelines),
        })),
      )
    },
  }
}
