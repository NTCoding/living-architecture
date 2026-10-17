import { describe, expect, it } from 'vitest'
import { PullRequestDraft } from '@living-architecture/dev-workflow-v3-domain-model'
import { OpenPullRequest } from './open-pull-request'
import { worktree } from './__fixtures__/command-test-fixtures'

const draft = PullRequestDraft.parse({
  title: 'feat: add the review cycle',
  description:
    'The workflow had no review cycle, so a pull request reached a person without an architecture review first. This adds the cycle.',
})

describe('OpenPullRequest', () => {
  it('opens the pull request for the branch', async () => {
    const command = new OpenPullRequest(async () => ({
      number: 549,
      url: 'https://github.com/o/r/pull/549',
    }))

    const result = await command.execute({ worktree, draft })

    expect(result.pullRequest.number()).toBe(549)
  })

  it('rejects a pull request the port reports without a usable url', async () => {
    const command = new OpenPullRequest(async () => ({ number: 549, url: 'nonsense' }))

    await expect(command.execute({ worktree, draft })).rejects.toThrow('Invalid url')
  })
})
