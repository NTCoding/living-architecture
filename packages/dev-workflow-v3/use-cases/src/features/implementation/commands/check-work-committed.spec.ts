import { describe, expect, it } from 'vitest'
import { fakeCommands } from '../../../infra/external-clients/process/__fixtures__/command-test-fixtures'
import { checkWorkCommittedWithGit } from '../adapters/git/check-work-committed'
import { CheckWorkCommitted } from './check-work-committed'

const worktreePath = '/worktrees/issue-500'

describe('CheckWorkCommitted', () => {
  it('reports a clean worktree with a commit ahead of the base', async () => {
    const runCommand = fakeCommands([
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '4d83240f6\n', stderr: '', exitCode: 0 },
      { stdout: 'origin/main\n', stderr: '', exitCode: 0 },
      { stdout: '2\n', stderr: '', exitCode: 0 },
    ])
    const command = new CheckWorkCommitted(
      checkWorkCommittedWithGit({ runCommand, repositoryPath: '/repo' }),
    )

    const result = await command.execute({ worktreePath })

    expect(result.clean).toBe(true)
    expect(result.hasCommit).toBe(true)
    expect(result.sha).toBe('4d83240f6')
  })

  it('reports the changes that are not committed yet', async () => {
    const runCommand = fakeCommands([
      { stdout: ' M src/order.ts\n?? src/new.ts\n', stderr: '', exitCode: 0 },
      { stdout: '4d83240f6\n', stderr: '', exitCode: 0 },
      { stdout: 'origin/main\n', stderr: '', exitCode: 0 },
      { stdout: '0\n', stderr: '', exitCode: 0 },
    ])
    const command = new CheckWorkCommitted(
      checkWorkCommittedWithGit({ runCommand, repositoryPath: '/repo' }),
    )

    const result = await command.execute({ worktreePath })

    expect(result.clean).toBe(false)
    expect(result.hasCommit).toBe(false)
    expect(result.status).toBe('M src/order.ts\n?? src/new.ts')
  })

  it('reports no commit when HEAD does not exist yet', async () => {
    const runCommand = fakeCommands([
      { stdout: '', stderr: '', exitCode: 0 },
      { stdout: '', stderr: 'fatal: ambiguous argument', exitCode: 128 },
      { stdout: 'origin/main\n', stderr: '', exitCode: 0 },
      { stdout: '0\n', stderr: '', exitCode: 0 },
    ])
    const command = new CheckWorkCommitted(
      checkWorkCommittedWithGit({ runCommand, repositoryPath: '/repo' }),
    )

    const result = await command.execute({ worktreePath })

    expect(result.sha).toBe('')
    expect(result.hasCommit).toBe(false)
  })
})
