import { describe, expect, it } from 'vitest'
import { OpenPullRequest } from './open-pull-request'
import { worktree } from './__fixtures__/command-test-fixtures'

const draft = {
  worktreePath: worktree.worktreePath,
  branch: worktree.branch,
  title: 'feat: add the review cycle',
  description:
    'The workflow had no review cycle, so a pull request reached a person without an architecture review first. This adds the cycle.',
}

describe('OpenPullRequest', () => {
  it('opens the pull request for the branch', async () => {
    const command = new OpenPullRequest(async () => ({
      number: 549,
      url: 'https://github.com/o/r/pull/549',
    }))

    const result = await command.execute(draft)

    expect(result.number).toBe(549)
    expect(result.url).toBe('https://github.com/o/r/pull/549')
  })

  it('rejects a pull request the port reports without a usable url', async () => {
    const command = new OpenPullRequest(async () => ({ number: 549, url: 'nonsense' }))

    await expect(command.execute(draft)).rejects.toThrow('Invalid url')
  })

  it('rejects a title that is not a conventional commit title', async () => {
    const command = new OpenPullRequest(async () => ({
      number: 549,
      url: 'https://github.com/o/r/pull/549',
    }))

    await expect(command.execute({ ...draft, title: 'add the review cycle' })).rejects.toThrow(
      'The pull request draft is not valid',
    )
  })
})
