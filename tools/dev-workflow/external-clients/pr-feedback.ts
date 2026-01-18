import { z } from 'zod'
import {
  getOctokit, getRepoInfo, DELETED_USER_PLACEHOLDER 
} from './github'

const feedbackItemSchema = z.object({
  threadId: z.string(),
  file: z.string().nullish(),
  line: z.number().nullish(),
  author: z.string(),
  body: z.string(),
})

const formattedFeedbackItemSchema = z.object({
  threadId: z.string(),
  location: z.string(),
  author: z.string(),
  body: z.string(),
})
export type FormattedFeedbackItem = z.infer<typeof formattedFeedbackItemSchema>

const reviewDecisionSchema = z.object({
  reviewer: z.string(),
  state: z.string(),
})
export type ReviewDecision = z.infer<typeof reviewDecisionSchema>

function formatFeedbackLocation(file?: string | null, line?: number | null): string {
  if (!file) {
    return 'PR-level'
  }
  if (line == null) {
    return file
  }
  return `${file}:${line}`
}

interface GraphQLResponse {
  repository: {
    pullRequest: {
      reviewThreads: {
        nodes: Array<{
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
        }>
      }
      latestOpinionatedReviews: {
        nodes: Array<{
          author: { login: string } | null
          state: string
        }>
      } | null
    }
  }
}

const PR_FEEDBACK_QUERY = `
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            isOutdated
            path
            line
            comments(first: 1) {
              nodes {
                author { login }
                body
              }
            }
          }
        }
        latestOpinionatedReviews(first: 50) {
          nodes {
            author { login }
            state
          }
        }
      }
    }
  }
`

async function fetchFeedbackFromGitHub(
  prNumber: number,
  options: { includeResolved?: boolean } = {},
): Promise<{
  threads: z.infer<typeof feedbackItemSchema>[]
  reviewDecisions: z.infer<typeof reviewDecisionSchema>[]
}> {
  const {
    owner, repo 
  } = await getRepoInfo()

  const response = await getOctokit().graphql<GraphQLResponse>(PR_FEEDBACK_QUERY, {
    owner,
    repo,
    pr: prNumber,
  })

  const rawThreads = response.repository.pullRequest.reviewThreads.nodes
  const rawReviews = response.repository.pullRequest.latestOpinionatedReviews?.nodes ?? []

  const threads = rawThreads
    .filter((t) => {
      if (t.comments.nodes.length === 0) return false
      if (options.includeResolved) return true
      return !t.isResolved && !t.isOutdated
    })
    .map((thread) => {
      const comment = thread.comments.nodes[0]
      return {
        threadId: thread.id,
        file: thread.path,
        line: thread.line,
        author: comment.author?.login ?? DELETED_USER_PLACEHOLDER,
        body: comment.body,
      }
    })

  const reviewDecisions = rawReviews.map((review) => ({
    reviewer: review.author?.login ?? DELETED_USER_PLACEHOLDER,
    state: review.state,
  }))

  return {
    threads,
    reviewDecisions,
  }
}

export async function getPRFeedback(
  prNumber: number,
  options: { includeResolved?: boolean } = {},
): Promise<{
  threads: FormattedFeedbackItem[]
  reviewDecisions: ReviewDecision[]
}> {
  const rawFeedback = await fetchFeedbackFromGitHub(prNumber, options)
  const threads = z.array(feedbackItemSchema).parse(rawFeedback.threads)
  const reviewDecisions = z.array(reviewDecisionSchema).parse(rawFeedback.reviewDecisions)

  return {
    threads: threads.map((f) => ({
      threadId: f.threadId,
      location: formatFeedbackLocation(f.file, f.line),
      author: f.author,
      body: f.body,
    })),
    reviewDecisions,
  }
}
