import { Octokit } from '@octokit/rest'
import simpleGit from 'simple-git'

export class GitHubError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitHubError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

/* v8 ignore start - env var handling, tests set GITHUB_TOKEN directly */
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
/* v8 ignore stop */

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

function determinePRState(mergedAt: string | null, state: string): PRState {
  if (mergedAt) {
    return 'merged'
  }
  if (state === 'open') {
    return 'open'
  }
  return 'closed'
}

interface GitHubIssue {
  number: number
  title: string
  assignees: { login: string }[]
  body: string | null
  milestone: { title: string } | null
  labels: { name: string }[]
}

type OctokitIssueList = Awaited<ReturnType<Octokit['issues']['listForRepo']>>['data']

function extractAssignees(
  assignees: OctokitIssueList[number]['assignees'],
): GitHubIssue['assignees'] {
  return (assignees ?? []).flatMap((a) => {
    if (a != null && 'login' in a && a.login) {
      return [{ login: a.login }]
    }
    return []
  })
}

function extractLabels(labels: OctokitIssueList[number]['labels']): GitHubIssue['labels'] {
  return labels.flatMap((l) => {
    if (typeof l === 'string' && l.length > 0) {
      return [{ name: l }]
    }
    if (l != null && typeof l === 'object' && 'name' in l && l.name) {
      return [{ name: l.name }]
    }
    return []
  })
}

function extractIssueFields(issues: OctokitIssueList): GitHubIssue[] {
  return issues
    .filter((issue) => !issue.pull_request)
    .map((raw) => ({
      number: raw.number,
      title: raw.title,
      assignees: extractAssignees(raw.assignees),
      body: raw.body ?? null,
      milestone: raw.milestone ? { title: raw.milestone.title } : null,
      labels: extractLabels(raw.labels),
    }))
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

  async getPRMergeInfo(prNumber: number): Promise<{
    mergeableState: string
    headSha: string
  }> {
    const {
      owner, repo 
    } = await getRepoInfo()

    const response = await getOctokit().pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    })

    return {
      mergeableState: response.data.mergeable_state,
      headSha: response.data.head.sha,
    }
  },

  async listCheckRuns(ref: string): Promise<
    Array<{
      name: string
      status: string
      conclusion: string | null
    }>
  > {
    const {
      owner, repo 
    } = await getRepoInfo()

    const response = await getOctokit().checks.listForRef({
      owner,
      repo,
      ref,
    })

    return response.data.check_runs.map((run) => ({
      name: run.name,
      status: run.status,
      conclusion: run.conclusion ?? null,
    }))
  },

  async listIssuesByMilestone(milestoneNumber: number): Promise<GitHubIssue[]> {
    const {
      owner, repo 
    } = await getRepoInfo()
    const response = await getOctokit().issues.listForRepo({
      owner,
      repo,
      milestone: String(milestoneNumber),
      state: 'open',
      per_page: 100,
    })
    return extractIssueFields(response.data)
  },

  async listIssuesByLabel(label: string): Promise<GitHubIssue[]> {
    const {
      owner, repo 
    } = await getRepoInfo()
    const response = await getOctokit().issues.listForRepo({
      owner,
      repo,
      labels: label,
      state: 'open',
      per_page: 100,
    })
    return extractIssueFields(response.data)
  },

  async getMilestoneNumber(milestoneName: string): Promise<number | undefined> {
    const {
      owner, repo 
    } = await getRepoInfo()
    const response = await getOctokit().issues.listMilestones({
      owner,
      repo,
      state: 'open',
      per_page: 100,
    })
    const milestone = response.data.find((m) => m.title === milestoneName)
    return milestone?.number
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

  async mergePR(prNumber: number): Promise<void> {
    const {
      owner, repo 
    } = await getRepoInfo()

    await getOctokit().pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      merge_method: 'squash',
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
