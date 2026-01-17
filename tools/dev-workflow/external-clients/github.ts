import { Octokit } from '@octokit/rest'
import simpleGit from 'simple-git'
import { GitHubError } from '../errors'

function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
  if (!token) {
    throw new GitHubError('GITHUB_TOKEN or GH_TOKEN environment variable is required')
  }
  return token
}

const getOctokit = (() => {
  const cache: { instance?: Octokit } = {}
  return (): Octokit => {
    if (cache.instance) {
      return cache.instance
    }

    cache.instance = new Octokit({ auth: getGitHubToken() })
    return cache.instance
  }
})()

const DELETED_USER_PLACEHOLDER = '[deleted]'

type PRState = 'open' | 'closed' | 'merged'

interface PR {
  number: number
  url: string
}

interface PRWithState extends PR {state: PRState}

interface CreatePROptions {
  title: string
  body: string
  branch: string
  base?: string
}

interface FeedbackItem {
  threadId: string
  file: string | null
  line: number | null
  author: string
  body: string
}

interface CIResult {
  failed: boolean
  output: string
}

function determinePRState(mergedAt: string | null, state: string): PRState {
  if (mergedAt) {
    return 'merged'
  }
  if (state === 'open') {
    return 'open'
  }
  return 'closed'
}

const repo = simpleGit()

const GITHUB_HTTPS_URL_PATTERN = /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/
const GITHUB_SSH_URL_PATTERN = /github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/

function parseGitHubUrl(url: string): {
  owner: string
  repo: string
} {
  const httpsMatch = GITHUB_HTTPS_URL_PATTERN.exec(url)
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2],
    }
  }

  const sshMatch = GITHUB_SSH_URL_PATTERN.exec(url)
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
    }
  }

  throw new GitHubError(`Could not parse GitHub URL: ${url}`)
}

async function getRepoInfo(): Promise<{
  owner: string
  repo: string
}> {
  const remotes = await repo.getRemotes(true)
  const origin = remotes.find((r) => r.name === 'origin')

  if (!origin?.refs.fetch) {
    throw new GitHubError('No origin remote found. Is this a git repository with a GitHub remote?')
  }

  return parseGitHubUrl(origin.refs.fetch)
}

export const github = {
  async findPRForBranch(branch: string): Promise<number | undefined> {
    const {
      owner, repo 
    } = await getRepoInfo()

    const response = await getOctokit().pulls.list({
      owner,
      repo,
      head: `${owner}:${branch}`,
      state: 'open',
    })

    if (response.data.length === 0) {
      return undefined
    }

    return response.data[0].number
  },

  async findPRForBranchWithState(branch: string): Promise<PRWithState | undefined> {
    const {
      owner, repo 
    } = await getRepoInfo()

    const response = await getOctokit().pulls.list({
      owner,
      repo,
      head: `${owner}:${branch}`,
      state: 'all',
    })

    if (response.data.length === 0) {
      return undefined
    }

    const pr = response.data[0]
    const prState = determinePRState(pr.merged_at, pr.state)

    return {
      number: pr.number,
      url: pr.html_url,
      state: prState,
    }
  },

  async getIssue(issueNumber: number): Promise<{
    title: string
    body: string
  }> {
    const {
      owner, repo 
    } = await getRepoInfo()

    const response = await getOctokit().issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    })

    if (!response.data.title) {
      throw new GitHubError(`Issue #${issueNumber} has no title`)
    }

    if (!response.data.body) {
      throw new GitHubError(`Issue #${issueNumber} has no body. Task issues require a description.`)
    }

    return {
      title: response.data.title,
      body: response.data.body,
    }
  },
  async createPR(opts: CreatePROptions): Promise<PR> {
    const {
      owner, repo 
    } = await getRepoInfo()

    const response = await getOctokit().pulls.create({
      owner,
      repo,
      title: opts.title,
      body: opts.body,
      head: opts.branch,
      base: opts.base ?? 'main',
    })

    return {
      number: response.data.number,
      url: response.data.html_url,
    }
  },

  async getPR(prNumber: number): Promise<PR> {
    const {
      owner, repo 
    } = await getRepoInfo()

    const response = await getOctokit().pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    })

    return {
      number: response.data.number,
      url: response.data.html_url,
    }
  },

  async getMergeableState(prNumber: number): Promise<string | null> {
    const {
      owner, repo 
    } = await getRepoInfo()

    const response = await getOctokit().pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    })

    return response.data.mergeable_state ?? null
  },

  async getUnresolvedFeedback(prNumber: number): Promise<FeedbackItem[]> {
    const {
      owner, repo 
    } = await getRepoInfo()

    const query = `
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
          }
        }
      }
    `

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
        }
      }
    }

    const response = await getOctokit().graphql<GraphQLResponse>(query, {
      owner,
      repo,
      pr: prNumber,
    })

    const threads = response.repository.pullRequest.reviewThreads.nodes

    return threads
      .filter((t) => !t.isResolved && !t.isOutdated && t.comments.nodes.length > 0)
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
  },

  async watchCI(
    prNumber: number,
    expectedSha?: string,
    timeoutMs = 10 * 60 * 1000,
  ): Promise<CIResult> {
    const {
      owner, repo 
    } = await getRepoInfo()
    const startTime = Date.now()
    const pollInterval = 30_000

    while (Date.now() - startTime < timeoutMs) {
      const { data: pr } = await getOctokit().pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      })

      if (expectedSha && pr.head.sha !== expectedSha) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval))
        continue
      }

      const { data: checks } = await getOctokit().checks.listForRef({
        owner,
        repo,
        ref: pr.head.sha,
        per_page: 100,
      })

      const completedChecks = checks.check_runs.filter((run) => run.status === 'completed')
      const failures = completedChecks.filter(
        (run) => run.conclusion !== 'success' && run.conclusion !== 'skipped',
      )

      if (failures.length > 0) {
        const output = failures
          .map((f) => {
            const header = `${f.name}: ${f.conclusion}`
            const summary = f.output?.summary ?? ''
            const details = f.output?.text ?? ''
            const detailUrl = f.details_url ?? ''

            const parts = [header]
            if (summary) parts.push(`Summary: ${summary}`)
            if (details) parts.push(`Details: ${details}`)
            if (detailUrl) parts.push(`URL: ${detailUrl}`)

            return parts.join('\n')
          })
          .join('\n\n')
        return {
          failed: true,
          output,
        }
      }

      const allComplete =
        checks.check_runs.length > 0 && checks.check_runs.every((run) => run.status === 'completed')

      if (allComplete) {
        return {
          failed: false,
          output: 'All checks passed',
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    return {
      failed: true,
      output: 'CI timed out waiting for checks to complete',
    }
  },

  async addThreadReply(threadId: string, body: string): Promise<void> {
    const mutation = `
      mutation($threadId: ID!, $body: String!) {
        addPullRequestReviewThreadReply(input: {
          pullRequestReviewThreadId: $threadId
          body: $body
        }) {
          comment {
            id
          }
        }
      }
    `

    await getOctokit().graphql(mutation, {
      threadId,
      body,
    })
  },

  async resolveThread(threadId: string): Promise<void> {
    const mutation = `
      mutation($threadId: ID!) {
        resolveReviewThread(input: {
          threadId: $threadId
        }) {
          thread {
            id
            isResolved
          }
        }
      }
    `

    await getOctokit().graphql(mutation, { threadId })
  },
}
