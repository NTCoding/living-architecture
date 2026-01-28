import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'

const { mockParseArg } = vi.hoisted(() => ({ mockParseArg: vi.fn() }))

vi.mock('../../../platform/infra/external-clients/cli-args', () => ({cli: { parseArg: mockParseArg },}))

import {
  resolvePRDetails, MissingPullRequestDetailsError 
} from './pull-request-draft'

describe('resolvePRDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns PR details from CLI args', () => {
    mockParseArg.mockImplementation((arg: string) => {
      const args: Record<string, string> = {
        '--pr-title': 'feat: test feature',
        '--pr-body': 'Test body',
        '--commit-message': 'feat: commit',
      }
      return args[arg]
    })

    const result = resolvePRDetails(undefined, undefined)

    expect(result.prTitle).toStrictEqual('feat: test feature')
    expect(result.prBody).toStrictEqual('Test body')
    expect(result.commitMessage).toContain('feat: commit')
    expect(result.hasIssue).toStrictEqual(false)
  })

  it('falls back to task details when CLI args missing', () => {
    mockParseArg.mockImplementation((arg: string) => {
      if (arg === '--commit-message') return 'feat: commit'
      return undefined
    })
    const taskDetails = {
      title: 'feat: from task',
      body: 'Task body',
    }

    const result = resolvePRDetails(123, taskDetails)

    expect(result.prTitle).toStrictEqual('feat: from task')
    expect(result.prBody).toStrictEqual('Task body')
    expect(result.hasIssue).toStrictEqual(true)
    expect(result.issueNumber).toStrictEqual(123)
  })

  it('throws MissingPullRequestDetailsError when no title', () => {
    mockParseArg.mockReturnValue(undefined)

    expect(() => resolvePRDetails(undefined, undefined)).toThrow(MissingPullRequestDetailsError)
  })

  it('throws when commit message is missing', () => {
    mockParseArg.mockImplementation((arg: string) => {
      const args: Record<string, string | undefined> = {
        '--pr-title': 'feat: title',
        '--pr-body': 'body',
        '--commit-message': undefined,
      }
      return args[arg]
    })

    expect(() => resolvePRDetails(undefined, undefined)).toThrow('--commit-message is required')
  })

  it('includes task details in result', () => {
    mockParseArg.mockImplementation((arg: string) => {
      const args: Record<string, string> = {
        '--pr-title': 'feat: title',
        '--pr-body': 'body',
        '--commit-message': 'feat: commit',
      }
      return args[arg]
    })
    const taskDetails = {
      title: 'original title',
      body: 'original body',
    }

    const result = resolvePRDetails(456, taskDetails)

    expect(result.taskDetails).toMatchObject({
      title: 'original title',
      body: 'original body',
    })
  })
})
