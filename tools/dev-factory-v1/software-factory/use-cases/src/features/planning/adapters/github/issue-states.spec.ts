import { describe, expect, it } from 'vitest'
import type { CommandRequest } from '../../../../infra/external-clients/process/run-command'
import { readIssueStatesWithGithub } from './issue-states'

function adapterWith(
  output: string,
  asked: CommandRequest[],
): ReturnType<typeof readIssueStatesWithGithub> {
  return readIssueStatesWithGithub({
    workingDirectory: '/repo',
    runCommand: (request) => {
      asked.push(request)
      return Promise.resolve({ exitCode: 0, stdout: output, stderr: '' })
    },
  })
}

describe('readIssueStatesWithGithub', () => {
  it('keeps the numbers it was asked about and says which are closed', async () => {
    const asked: CommandRequest[] = []
    const read = adapterWith(
      '[{"number":901,"state":"CLOSED"},{"number":902,"state":"OPEN"},{"number":903,"state":"OPEN"}]',
      asked,
    )

    const states = await read([901, 902])

    expect(states).toStrictEqual([
      { number: 901, closed: true },
      { number: 902, closed: false },
    ])
    expect(asked[0]?.arguments).toContain('issue')
  })

  it('asks GitHub nothing when there is no story to look up', async () => {
    const asked: CommandRequest[] = []

    expect(await adapterWith('[]', asked)([])).toStrictEqual([])
    expect(asked).toStrictEqual([])
  })
})
