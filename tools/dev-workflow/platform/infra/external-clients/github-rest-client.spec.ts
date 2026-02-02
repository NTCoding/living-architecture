import {
  describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'

const {
  mockOctokitInstance, mockRepo 
} = vi.hoisted(() => ({
  mockOctokitInstance: {
    pulls: {
      list: vi.fn(),
      get: vi.fn(),
      create: vi.fn(),
      merge: vi.fn(),
    },
    issues: {
      get: vi.fn(),
      listForRepo: vi.fn(),
    },
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
  const originalToken = process.env.GITHUB_TOKEN

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GITHUB_TOKEN = 'test-token'
  })

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN
    } else {
      process.env.GITHUB_TOKEN = originalToken
    }
  })

  it('returns octokit instance with expected API methods', () => {
    const octokit = getOctokit()

    expect(typeof octokit.pulls.list).toBe('function')
    expect(typeof octokit.issues.get).toBe('function')
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

  it.each([
    ['returns PR number when found', [{ number: 123 }], 123],
    ['returns undefined when no PR found', [], undefined],
  ])('%s', async (_name, data, expected) => {
    mockOctokitInstance.pulls.list.mockResolvedValue({ data })
    const prNumber = await github.findPRForBranch('branch')
    expect(prNumber).toBe(expected)
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
    expect((await github.findPRForBranchWithState('feature'))?.state).toBe(expectedState)
  })

  it('returns undefined when no PR found', async () => {
    mockOctokitInstance.pulls.list.mockResolvedValue({ data: [] })
    expect(await github.findPRForBranchWithState('no-pr-branch')).toBeUndefined()
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

  it.each([
    ['no title', '', 'Body', 'has no title'],
    ['no body', 'Title', '', 'has no body'],
  ])('throws when issue has %s', async (_name, title, body, expectedError) => {
    mockOctokitInstance.issues.get.mockResolvedValue({
      data: {
        title,
        body,
      },
    })
    await expect(github.getIssue(42)).rejects.toThrow(expectedError)
  })
})

describe('github PR operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRepo.getRemotes.mockResolvedValue([
      {
        name: 'origin',
        refs: { fetch: 'https://github.com/owner/repo.git' },
      },
    ])
  })

  it('createPR returns number and URL', async () => {
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

  it('getPR returns PR number and URL', async () => {
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

  it('getPRWithState returns PR with state', async () => {
    mockOctokitInstance.pulls.get.mockResolvedValue({
      data: {
        number: 60,
        html_url: 'https://github.com/owner/repo/pull/60',
        merged_at: null,
        state: 'open',
      },
    })
    expect((await github.getPRWithState(60)).state).toBe('open')
  })

  it('getPRMergeInfo returns mergeable state and head SHA', async () => {
    mockOctokitInstance.pulls.get.mockResolvedValue({
      data: {
        mergeable_state: 'clean',
        head: { sha: 'abc123' },
      },
    })
    expect(await github.getPRMergeInfo(70)).toStrictEqual({
      mergeableState: 'clean',
      headSha: 'abc123',
    })
  })

  it('mergePR calls squash merge', async () => {
    mockOctokitInstance.pulls.merge.mockResolvedValue({})
    await github.mergePR(100)
    expect(mockOctokitInstance.pulls.merge).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      pull_number: 100,
      merge_method: 'squash',
    })
  })

  it('listCheckRuns returns check run summaries', async () => {
    mockOctokitInstance.checks.listForRef.mockResolvedValue({
      data: {
        check_runs: [
          {
            name: 'Build',
            status: 'completed',
            conclusion: 'success',
          },
          {
            name: 'Knip',
            status: 'completed',
            conclusion: 'failure',
          },
          {
            name: 'Pending',
            status: 'in_progress',
            conclusion: null,
          },
        ],
      },
    })
    expect(await github.listCheckRuns('abc123')).toStrictEqual([
      {
        name: 'Build',
        status: 'completed',
        conclusion: 'success',
      },
      {
        name: 'Knip',
        status: 'completed',
        conclusion: 'failure',
      },
      {
        name: 'Pending',
        status: 'in_progress',
        conclusion: null,
      },
    ])
  })
})

describe('github thread operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOctokitInstance.graphql.mockResolvedValue({})
  })

  it('addThreadReply calls graphql with reply mutation', async () => {
    await github.addThreadReply('thread-id', 'Reply body')
    expect(mockOctokitInstance.graphql).toHaveBeenCalledWith(
      expect.stringContaining('addPullRequestReviewThreadReply'),
      {
        threadId: 'thread-id',
        body: 'Reply body',
      },
    )
  })

  it('resolveThread calls graphql with resolve mutation', async () => {
    await github.resolveThread('thread-id')
    expect(mockOctokitInstance.graphql).toHaveBeenCalledWith(
      expect.stringContaining('resolveReviewThread'),
      { threadId: 'thread-id' },
    )
  })
})
