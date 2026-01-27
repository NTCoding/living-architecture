import { Octokit } from '@octokit/rest'
import simpleGit from 'simple-git'

export class GitHubError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitHubError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

function getGitHubToken(): string {
  const githubToken = process.env.GITHUB_TOKEN
  const ghToken = process.env.GH_TOKEN

  if (githubToken) {
    return githubToken
  }

  if (ghToken) {
    return ghToken
  }

  throw new GitHubError(
    'GitHub token not found. Set GITHUB_TOKEN or GH_TOKEN environment variable.',
  )
}

export const getOctokit = (() => {
  const cache: { instance?: Octokit } = {}
  return (): Octokit => {
    if (cache.instance) {
      return cache.instance
    }

    cache.instance = new Octokit({ auth: getGitHubToken() })
    return cache.instance
  }
})()

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
  base: string
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

export async function getRepoInfo(): Promise<{
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
      base: opts.base,
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

  async getPRWithState(prNumber: number): Promise<PRWithState> {
    const {
      owner, repo 
    } = await getRepoInfo()

    const response = await getOctokit().pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    })

    const prState = determinePRState(response.data.merged_at, response.data.state)

    return {
      number: response.data.number,
      url: response.data.html_url,
      state: prState,
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

    return response.data.mergeable_state
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

      if (checks.check_runs.length === 0) {
        return {
          failed: false,
          output: 'No CI checks configured for this ref - treating as passing',
        }
      }

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
