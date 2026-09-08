import type { ReviewJobStore } from '@nt-ai-lab/deterministic-agent-workflow-engine'

class NoopReviewStoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NoopReviewStoreError'
  }
}

/** @riviere-role main */
export function noopReviewStore(): ReviewJobStore {
  const unavailable = (): never => {
    throw new NoopReviewStoreError(
      'The platform review job store is not used by this workflow; reviews are consumer-owned.',
    )
  }
  return {
    cancelReviewBundle: unavailable,
    claimReviewBundle: unavailable,
    claimReviewExecution: unavailable,
    completeReviewAgent: unavailable,
    completeReviewBundle: unavailable,
    failReviewBundle: unavailable,
    findActiveReviewBundle: unavailable,
    getReviewBundle: unavailable,
    listReviewAgents: unavailable,
    markReviewAgentRunning: unavailable,
    markReviewBundleRunning: unavailable,
    resumeReviewAgent: unavailable,
  }
}
