import { fetchRawPRFeedback } from '../../infra/external-clients/github-graphql-client'
import {
  classifyThread, formatThreadForOutput, type FormattedFeedbackItem 
} from './review-thread'
import { Reviewer } from './reviewer'
import { type ReviewDecision } from './review-decision'

export type { FormattedFeedbackItem }

export async function getPRFeedback(
  prNumber: number,
  options: { includeResolved?: boolean } = {},
): Promise<{
  threads: FormattedFeedbackItem[]
  reviewDecisions: ReviewDecision[]
}> {
  const rawFeedback = await fetchRawPRFeedback(prNumber)

  const threads = rawFeedback.threads
    .map(classifyThread)
    .filter((thread): thread is NonNullable<typeof thread> => thread !== null)
    .filter((thread) => {
      if (options.includeResolved) return true
      return thread.type === 'active'
    })
    .map(formatThreadForOutput)

  const reviewDecisions = rawFeedback.reviewDecisions.map((review) => ({
    reviewer: Reviewer.create(review.author?.login).value,
    state: review.state,
  }))

  return {
    threads,
    reviewDecisions,
  }
}
