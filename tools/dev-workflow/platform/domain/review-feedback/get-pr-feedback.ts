import {
  classifyThread, formatThreadForOutput, type FormattedFeedbackItem 
} from './review-thread'
import { Reviewer } from './reviewer'
import {
  reviewDecisionSchema, type ReviewDecision 
} from './review-decision'

interface RawReviewThread {
  id: string
  isResolved: boolean
  isOutdated: boolean
  path: string | null
  line: number | null
  comments: {
    nodes: Array<{
      author: { login: string } | null
      body: string
    }>
  }
}

interface RawReviewDecision {
  author: { login: string } | null
  state: string
}

interface RawPRFeedbackData {
  threads: RawReviewThread[]
  reviewDecisions: RawReviewDecision[]
}

export type FetchRawPRFeedback = (prNumber: number) => Promise<RawPRFeedbackData>

export async function getPRFeedback(
  fetchRaw: FetchRawPRFeedback,
  prNumber: number,
  options: { includeResolved?: boolean } = {},
): Promise<{
  threads: FormattedFeedbackItem[]
  reviewDecisions: ReviewDecision[]
}> {
  const rawFeedback = await fetchRaw(prNumber)

  const threads = rawFeedback.threads
    .map(classifyThread)
    .filter((thread): thread is NonNullable<typeof thread> => thread !== null)
    .filter((thread) => {
      if (options.includeResolved) return true
      return thread.type === 'active'
    })
    .map(formatThreadForOutput)

  const reviewDecisions = rawFeedback.reviewDecisions.map((review) =>
    reviewDecisionSchema.parse({
      reviewer: Reviewer.createFromGitHubLogin(review.author?.login).value,
      state: review.state,
    }),
  )

  return {
    threads,
    reviewDecisions,
  }
}
