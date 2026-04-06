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
    }

    const result = resolvePRDetails(cliArgs, undefined, undefined)

    expect(result.prTitle).toStrictEqual('feat: test feature')
    expect(result.prBody).toStrictEqual('Test body')
    expect(result.hasIssue).toStrictEqual(false)
  })

  it('falls back to task details when CLI args missing', () => {
    const cliArgs = {
      prTitle: undefined,
      prBody: undefined,
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
    }

    expect(() => resolvePRDetails(cliArgs, undefined, undefined)).toThrow(
      MissingPullRequestDetailsError,
    )
  })

  it('includes task details in result', () => {
    const cliArgs = {
      prTitle: 'feat: title',
      prBody: 'body',
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
