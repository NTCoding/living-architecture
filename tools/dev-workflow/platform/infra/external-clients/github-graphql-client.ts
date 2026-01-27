import {
  getOctokit, getRepoInfo 
} from './github-rest-client'

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

interface GraphQLResponse {
  repository: {
    pullRequest: {
      reviewThreads: { nodes: RawReviewThread[] }
      latestOpinionatedReviews: { nodes: RawReviewDecision[] } | null
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

export interface RawPRFeedback {
  threads: RawReviewThread[]
  reviewDecisions: RawReviewDecision[]
}

export async function fetchRawPRFeedback(prNumber: number): Promise<RawPRFeedback> {
  const {
    owner, repo 
  } = await getRepoInfo()

  const response = await getOctokit().graphql<GraphQLResponse>(PR_FEEDBACK_QUERY, {
    owner,
    repo,
    pr: prNumber,
  })

  return {
    threads: response.repository.pullRequest.reviewThreads.nodes,
    reviewDecisions: response.repository.pullRequest.latestOpinionatedReviews?.nodes ?? [],
  }
}
