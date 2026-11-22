import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { readPullRequestFeedbackWithGithub } from './read-pull-request-feedback'

describe('readPullRequestFeedbackWithGithub', () => {
  it('reads the feedback for the pull request', async () => {
    const runCommand = fakeCommands([
      {
        stdout: JSON.stringify([
          {
            id: 4306,
            path: 'src/order.ts',
            line: 12,
            body: 'A rule.',
            user: { login: 'coderabbitai' },
          },
        ]),
        stderr: '',
        exitCode: 0,
      },
      { stdout: '[]', stderr: '', exitCode: 0 },
    ])

    const feedback = await readPullRequestFeedbackWithGithub({
      runCommand,
      workingDirectory: '/repo',
    })({ pullRequestNumber: 549 })

    expect(feedback.reviewSeen).toBe(true)
    expect(runCommand.requests[0]?.workingDirectory).toBe('/repo')
  })
})
