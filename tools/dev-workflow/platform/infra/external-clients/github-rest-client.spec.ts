import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const {
  mockOctokitInstance, mockRepo 
} = vi.hoisted(() => ({
  mockOctokitInstance: {
    pulls: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
    },
    issues: { get: vi.fn() },
    checks: { listForRef: vi.fn() },
    graphql: vi.fn(),
  },
  mockRepo: { getRemotes: vi.fn() },
}))

vi.mock('@octokit/rest', () => ({
  Octokit: class MockOctokit {
    pulls = mockOctokitInstance.pulls
    issues = mockOctokitInstance.issues
    checks = mockOctokitInstance.checks
    graphql = mockOctokitInstance.graphql
  },
}))

vi.mock('simple-git', () => ({ default: () => mockRepo }))

import {
  github, getRepoInfo, GitHubError, getOctokit 
} from './github-rest-client'

describe('GitHubError', () => {
  it('creates error with name GitHubError', () => {
    const error = new GitHubError('test message')

    expect(error.name).toBe('GitHubError')
    expect(error.message).toBe('test message')
  })
})

describe('getOctokit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GITHUB_TOKEN = 'test-token'
  })

  it('returns octokit instance when token is set', () => {
    const octokit = getOctokit()

    expect(octokit).toBeDefined()
  })
})

describe('getRepoInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['HTTPS with .git', 'https://github.com/owner/repo.git'],
    ['SSH', 'git@github.com:owner/repo.git'],
    ['HTTPS without .git', 'https://github.com/owner/repo'],
  ])('parses %s URL', async (_name, url) => {
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: { fetch: url },
      },
    ])

    const info = await getRepoInfo()

    expect(info).toStrictEqual({
      owner: 'owner',
      repo: 'repo',
    })
  })

  it('throws when no origin remote found', async () => {
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'upstream',
        refs: { fetch: 'https://github.com/other/repo.git' },
      },
    ])

    await expect(getRepoInfo()).rejects.toThrow(GitHubError)
  })

  it('throws when URL cannot be parsed', async () => {
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: { fetch: 'https://gitlab.com/owner/repo.git' },
      },
    ])

    await expect(getRepoInfo()).rejects.toThrow('Could not parse GitHub URL')
  })
})

describe('github.findPRForBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: { fetch: 'https://github.com/owner/repo.git' },
      },
    ])
  })

  it('returns PR number when found', async () => {
    mockOctokitInstance.pulls.list.mockResolvedValue({ data: [{ number: 123 }] })

    const prNumber = await github.findPRForBranch('feature-branch')

    expect(prNumber).toBe(123)
  })

  it('returns undefined when no PR found', async () => {
    mockOctokitInstance.pulls.list.mockResolvedValue({ data: [] })

    const prNumber = await github.findPRForBranch('no-pr-branch')

    expect(prNumber).toBeUndefined()
  })
})

describe('github.findPRForBranchWithState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: { fetch: 'https://github.com/owner/repo.git' },
      },
    ])
  })

  it.each([
    ['merged', '2024-01-01T00:00:00Z', 'closed', 'merged'],
    ['open', null, 'open', 'open'],
    ['closed', null, 'closed', 'closed'],
  ])('returns %s state for PR', async (_name, mergedAt, apiState, expectedState) => {
    mockOctokitInstance.pulls.list.mockResolvedValue({
      data: [
        {
          number: 123,
          html_url: 'https://github.com/o/r/pull/123',
          merged_at: mergedAt,
          state: apiState,
        },
      ],
    })

    const pr = await github.findPRForBranchWithState('feature')

    expect(pr?.state).toBe(expectedState)
  })

  it('returns undefined when no PR found', async () => {
    mockOctokitInstance.pulls.list.mockResolvedValue({ data: [] })

    const pr = await github.findPRForBranchWithState('no-pr-branch')

    expect(pr).toBeUndefined()
  })
})

describe('github.getIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: { fetch: 'https://github.com/owner/repo.git' },
      },
    ])
  })

  it('returns issue title and body', async () => {
    mockOctokitInstance.issues.get.mockResolvedValue({
      data: {
        title: 'Issue Title',
        body: 'Issue body',
      },
    })

    const issue = await github.getIssue(42)

    expect(issue).toStrictEqual({
      title: 'Issue Title',
      body: 'Issue body',
    })
  })

  it('throws when issue has no title', async () => {
    mockOctokitInstance.issues.get.mockResolvedValue({
      data: {
        title: '',
        body: 'Body',
      },
    })

    await expect(github.getIssue(42)).rejects.toThrow('has no title')
  })

  it('throws when issue has no body', async () => {
    mockOctokitInstance.issues.get.mockResolvedValue({
      data: {
        title: 'Title',
        body: '',
      },
    })

    await expect(github.getIssue(42)).rejects.toThrow('has no body')
  })
})

describe('github.createPR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: { fetch: 'https://github.com/owner/repo.git' },
      },
    ])
  })

  it('creates PR and returns number and URL', async () => {
    mockOctokitInstance.pulls.create.mockResolvedValue({
      data: {
        number: 100,
        html_url: 'https://github.com/owner/repo/pull/100',
      },
    })

    const pr = await github.createPR({
      title: 'My PR',
      body: 'Description',
      branch: 'feature',
      base: 'main',
    })

    expect(pr).toStrictEqual({
      number: 100,
      url: 'https://github.com/owner/repo/pull/100',
    })
  })
})

describe('github.getPR', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: { fetch: 'https://github.com/owner/repo.git' },
      },
    ])
  })

  it('returns PR number and URL', async () => {
    mockOctokitInstance.pulls.get.mockResolvedValue({
      data: {
        number: 50,
        html_url: 'https://github.com/owner/repo/pull/50',
      },
    })

    const pr = await github.getPR(50)

    expect(pr).toStrictEqual({
      number: 50,
      url: 'https://github.com/owner/repo/pull/50',
    })
  })
})

describe('github.getPRWithState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: { fetch: 'https://github.com/owner/repo.git' },
      },
    ])
  })

  it('returns PR with state', async () => {
    mockOctokitInstance.pulls.get.mockResolvedValue({
      data: {
        number: 60,
        html_url: 'https://github.com/owner/repo/pull/60',
        merged_at: null,
        state: 'open',
      },
    })

    const pr = await github.getPRWithState(60)

    expect(pr.state).toBe('open')
  })
})

describe('github.getMergeableState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: { fetch: 'https://github.com/owner/repo.git' },
      },
    ])
  })

  it('returns mergeable state', async () => {
    mockOctokitInstance.pulls.get.mockResolvedValue({ data: { mergeable_state: 'clean' } })

    const state = await github.getMergeableState(70)

    expect(state).toBe('clean')
  })
})

describe('github.addThreadReply', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls graphql with reply mutation', async () => {
    mockOctokitInstance.graphql.mockResolvedValue({})

    await github.addThreadReply('thread-id', 'Reply body')

    expect(mockOctokitInstance.graphql).toHaveBeenCalledWith(
      expect.stringContaining('addPullRequestReviewThreadReply'),
      {
        threadId: 'thread-id',
        body: 'Reply body',
      },
    )
  })
})

describe('github.resolveThread', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls graphql with resolve mutation', async () => {
    mockOctokitInstance.graphql.mockResolvedValue({})

    await github.resolveThread('thread-id')

    expect(mockOctokitInstance.graphql).toHaveBeenCalledWith(
      expect.stringContaining('resolveReviewThread'),
      { threadId: 'thread-id' },
    )
  })
})

describe('github.watchCI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: { fetch: 'https://github.com/owner/repo.git' },
      },
    ])
  })

  it('returns success when no CI checks configured', async () => {
    mockOctokitInstance.pulls.get.mockResolvedValue({ data: { head: { sha: 'abc123' } } })
    mockOctokitInstance.checks.listForRef.mockResolvedValue({ data: { check_runs: [] } })

    const result = await github.watchCI(123)

    expect(result.failed).toBe(false)
    expect(result.output).toContain('No CI checks configured')
  })

  it('returns failure when checks fail', async () => {
    mockOctokitInstance.pulls.get.mockResolvedValue({ data: { head: { sha: 'abc123' } } })
    mockOctokitInstance.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [
          {
            name: 'test',
            status: 'completed',
            conclusion: 'failure',
            output: {
              summary: 'Tests failed',
              text: 'Details here',
            },
            details_url: 'https://example.com/details',
          },
        ],
      },
    })

    const result = await github.watchCI(123)

    expect(result.failed).toBe(true)
    expect(result.output).toContain('test: failure')
  })

  it('returns failure with minimal output when check has no output details', async () => {
    mockOctokitInstance.pulls.get.mockResolvedValue({ data: { head: { sha: 'abc123' } } })
    mockOctokitInstance.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [
          {
            name: 'lint',
            status: 'completed',
            conclusion: 'failure',
          },
        ],
      },
    })

    const result = await github.watchCI(123)

    expect(result.failed).toBe(true)
    expect(result.output).toBe('lint: failure')
  })

  it('returns success when all checks pass', async () => {
    mockOctokitInstance.pulls.get.mockResolvedValue({ data: { head: { sha: 'abc123' } } })
    mockOctokitInstance.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [
          {
            name: 'test',
            status: 'completed',
            conclusion: 'success',
          },
        ],
      },
    })

    const result = await github.watchCI(123)

    expect(result.failed).toBe(false)
    expect(result.output).toBe('All checks passed')
  })

  it('treats skipped checks as passing', async () => {
    mockOctokitInstance.pulls.get.mockResolvedValue({ data: { head: { sha: 'abc123' } } })
    mockOctokitInstance.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [
          {
            name: 'optional-check',
            status: 'completed',
            conclusion: 'skipped',
          },
        ],
      },
    })

    const result = await github.watchCI(123)

    expect(result.failed).toBe(false)
    expect(result.output).toBe('All checks passed')
  })
})
