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
    issues: {
      get: vi.fn(),
      listForRepo: vi.fn(),
      listMilestones: vi.fn(),
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

import { github } from './rest-client'

function setupRemotes() {
  mockRepo.getRemotes.mockResolvedValue([
    {
      name: 'origin',
      refs: { fetch: 'https://github.com/owner/repo.git' },
    },
  ])
}

describe('github.listIssuesByMilestone', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GITHUB_TOKEN = 'test-token'
    setupRemotes()
  })

  it('returns open issues for the given milestone number', async () => {
    mockOctokitInstance.issues.listForRepo.mockResolvedValue({
      data: [
        {
          number: 166,
          title: 'Add CLI flags',
          assignees: [{ login: 'NTCoding' }],
          body: 'some body',
          milestone: { title: 'phase-11' },
          labels: [{ name: 'prd:phase-11' }],
          pull_request: undefined,
        },
      ],
    })

    const result = await github.listIssuesByMilestone(3)

    expect(mockOctokitInstance.issues.listForRepo).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      milestone: '3',
      state: 'open',
      per_page: 100,
    })
    expect(result).toStrictEqual([
      {
        number: 166,
        title: 'Add CLI flags',
        assignees: [{ login: 'NTCoding' }],
        body: 'some body',
        milestone: { title: 'phase-11' },
        labels: [{ name: 'prd:phase-11' }],
      },
    ])
  })

  it('filters out assignees without login from results', async () => {
    mockOctokitInstance.issues.listForRepo.mockResolvedValue({
      data: [
        {
          number: 200,
          title: 'Issue with null assignee',
          assignees: [null, { login: 'validUser' }, { id: 999 }],
          body: 'body',
          milestone: null,
          labels: [],
          pull_request: undefined,
        },
      ],
    })

    const result = await github.listIssuesByMilestone(3)

    expect(result[0].assignees).toStrictEqual([{ login: 'validUser' }])
  })

  it('returns null body when issue body is undefined', async () => {
    mockOctokitInstance.issues.listForRepo.mockResolvedValue({
      data: [
        {
          number: 203,
          title: 'Issue without body',
          assignees: [],
          body: undefined,
          milestone: null,
          labels: [],
          pull_request: undefined,
        },
      ],
    })

    const result = await github.listIssuesByMilestone(3)

    expect(result[0].body).toBeNull()
  })

  it('handles null assignees array gracefully', async () => {
    mockOctokitInstance.issues.listForRepo.mockResolvedValue({
      data: [
        {
          number: 201,
          title: 'Issue with null assignees',
          assignees: null,
          body: 'body',
          milestone: null,
          labels: [],
          pull_request: undefined,
        },
      ],
    })

    const result = await github.listIssuesByMilestone(3)

    expect(result[0].assignees).toStrictEqual([])
  })

  it('handles labels with string entries and null names', async () => {
    mockOctokitInstance.issues.listForRepo.mockResolvedValue({
      data: [
        {
          number: 202,
          title: 'Issue with mixed labels',
          assignees: [],
          body: 'body',
          milestone: null,
          labels: ['plain-string-label', { name: 'object-label' }, { name: null }, { name: '' }],
          pull_request: undefined,
        },
      ],
    })

    const result = await github.listIssuesByMilestone(3)

    expect(result[0].labels).toStrictEqual([
      { name: 'plain-string-label' },
      { name: 'object-label' },
    ])
  })

  it('filters out pull requests from results', async () => {
    mockOctokitInstance.issues.listForRepo.mockResolvedValue({
      data: [
        {
          number: 100,
          title: 'A PR',
          assignees: [],
          body: 'pr body',
          milestone: { title: 'phase-11' },
          labels: [],
          pull_request: { url: 'https://...' },
        },
        {
          number: 166,
          title: 'An issue',
          assignees: [],
          body: 'issue body',
          milestone: { title: 'phase-11' },
          labels: [],
          pull_request: undefined,
        },
      ],
    })

    const result = await github.listIssuesByMilestone(3)

    expect(result).toHaveLength(1)
    expect(result[0].number).toBe(166)
  })
})

describe('github.getMilestoneNumber', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GITHUB_TOKEN = 'test-token'
    setupRemotes()
  })

  it('returns milestone number when milestone exists', async () => {
    mockOctokitInstance.issues.listMilestones.mockResolvedValue({
      data: [
        {
          number: 3,
          title: 'phase-11-metadata-extraction',
        },
        {
          number: 5,
          title: 'phase-12-ui',
        },
      ],
    })

    const result = await github.getMilestoneNumber('phase-11-metadata-extraction')

    expect(result).toBe(3)
  })

  it('returns undefined when milestone does not exist', async () => {
    mockOctokitInstance.issues.listMilestones.mockResolvedValue({
      data: [
        {
          number: 3,
          title: 'phase-11',
        },
      ],
    })

    const result = await github.getMilestoneNumber('nonexistent')

    expect(result).toBeUndefined()
  })
})

describe('github.listIssuesByLabel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GITHUB_TOKEN = 'test-token'
    setupRemotes()
  })

  it('returns open issues with the given label', async () => {
    mockOctokitInstance.issues.listForRepo.mockResolvedValue({
      data: [
        {
          number: 174,
          title: 'Tech task',
          assignees: [],
          body: 'tech body',
          milestone: null,
          labels: [{ name: 'tech improvement' }],
          pull_request: undefined,
        },
      ],
    })

    const result = await github.listIssuesByLabel('tech improvement')

    expect(mockOctokitInstance.issues.listForRepo).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      labels: 'tech improvement',
      state: 'open',
      per_page: 100,
    })
    expect(result).toStrictEqual([
      {
        number: 174,
        title: 'Tech task',
        assignees: [],
        body: 'tech body',
        milestone: null,
        labels: [{ name: 'tech improvement' }],
      },
    ])
  })
})
