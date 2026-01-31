import {
  describe, it, expect 
} from 'vitest'

import {
  resolvePRDetails, MissingPullRequestDetailsError 
} from './pull-request-draft'

describe('resolvePRDetails', () => {
  it('returns PR details from CLI args', () => {
    const cliArgs = {
      prTitle: 'feat: test feature',
      prBody: 'Test body',
      commitMessage: 'feat: commit',
    }

    const result = resolvePRDetails(cliArgs, undefined, undefined)

    expect(result.prTitle).toStrictEqual('feat: test feature')
    expect(result.prBody).toStrictEqual('Test body')
    expect(result.commitMessage).toContain('feat: commit')
    expect(result.hasIssue).toStrictEqual(false)
  })

  it('falls back to task details when CLI args missing', () => {
    const cliArgs = {
      prTitle: undefined,
      prBody: undefined,
      commitMessage: 'feat: commit',
    }
    const taskDetails = {
      title: 'feat: from task',
      body: 'Task body',
    }

    const result = resolvePRDetails(cliArgs, 123, taskDetails)

    expect(result.prTitle).toStrictEqual('feat: from task')
    expect(result.prBody).toStrictEqual('Closes #123\n\nTask body')
    expect(result.hasIssue).toStrictEqual(true)
    expect(result.issueNumber).toStrictEqual(123)
  })

  it('throws MissingPullRequestDetailsError when no title', () => {
    const cliArgs = {
      prTitle: undefined,
      prBody: undefined,
      commitMessage: undefined,
    }

    expect(() => resolvePRDetails(cliArgs, undefined, undefined)).toThrow(
      MissingPullRequestDetailsError,
    )
  })

  it('throws when commit message is missing', () => {
    const cliArgs = {
      prTitle: 'feat: title',
      prBody: 'body',
      commitMessage: undefined,
    }

    expect(() => resolvePRDetails(cliArgs, undefined, undefined)).toThrow(
      '--commit-message is required',
    )
  })

  it('includes task details in result', () => {
    const cliArgs = {
      prTitle: 'feat: title',
      prBody: 'body',
      commitMessage: 'feat: commit',
    }
    const taskDetails = {
      title: 'original title',
      body: 'original body',
    }

    const result = resolvePRDetails(cliArgs, 456, taskDetails)

    expect(result.taskDetails).toMatchObject({
      title: 'original title',
      body: 'original body',
    })
  })
})
