import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { readIssueWithGithub } from './read-issue'

describe('readIssueWithGithub', () => {
  it('reads the issue title and body', async () => {
    const runCommand = fakeCommands([
      {
        stdout: JSON.stringify({ title: 'Add a review cycle', body: 'The problem.' }),
        stderr: '',
        exitCode: 0,
      },
    ])

    const issue = await readIssueWithGithub({ runCommand, workingDirectory: '/repo' })(455)

    expect(issue).toStrictEqual({ title: 'Add a review cycle', body: 'The problem.' })
    expect(runCommand.requests[0]?.arguments).toStrictEqual([
      'issue',
      'view',
      '455',
      '--json',
      'title,body',
    ])
  })

  it('treats a missing body as empty text', async () => {
    const runCommand = fakeCommands([
      { stdout: JSON.stringify({ title: 'An issue', body: null }), stderr: '', exitCode: 0 },
    ])

    const issue = await readIssueWithGithub({ runCommand, workingDirectory: '/repo' })(455)

    expect(issue.body).toBe('')
  })

  it('fails when the issue cannot be read', async () => {
    const runCommand = fakeCommands([{ stdout: '', stderr: 'no such issue', exitCode: 1 }])

    await expect(
      readIssueWithGithub({ runCommand, workingDirectory: '/repo' })(455),
    ).rejects.toThrow('no such issue')
  })
})
