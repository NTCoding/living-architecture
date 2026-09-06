import { describe, expect, it, vi } from 'vitest'
import { createGithubPullRequestClient } from './create-pull-request'

class GithubFailure extends Error {}

const creationRequest = {
  branch: 'issue-42',
  title: 'Ready PR',
  body: '## Description\n\nCreates a ready PR.',
}
const existingPullRequest = {
  number: 123,
  url: 'https://github.com/example/repo/pull/123',
  isDraft: false,
}
const lookupArguments = [
  'pr',
  'list',
  '--head',
  'issue-42',
  '--state',
  'open',
  '--limit',
  '2',
  '--json',
  'number,url,isDraft',
]
const createArguments = [
  'pr',
  'create',
  '--head',
  'issue-42',
  '--title',
  creationRequest.title,
  '--body',
  creationRequest.body,
]

describe('createGithubPullRequestClient', () => {
  it.each([false, true])(
    'returns created PR draft status %s without changing readiness',
    (isDraft) => {
      const runGh = vi
        .fn<(args: readonly string[]) => string>()
        .mockReturnValueOnce('[]')
        .mockReturnValueOnce(`${existingPullRequest.url}\n`)
        .mockReturnValueOnce(JSON.stringify({ ...existingPullRequest, isDraft }))

      expect(createGithubPullRequestClient(runGh)(creationRequest)).toStrictEqual({
        prNumber: 123,
        prUrl: existingPullRequest.url,
        isDraft,
      })
      expect(runGh.mock.calls).toStrictEqual([
        [lookupArguments],
        [createArguments],
        [['pr', 'view', existingPullRequest.url, '--json', 'number,url,isDraft']],
      ])
    },
  )

  it('returns the existing PR without creating another one', () => {
    const runGh = vi
      .fn<(args: readonly string[]) => string>()
      .mockReturnValue(JSON.stringify([existingPullRequest]))

    expect(createGithubPullRequestClient(runGh)(creationRequest)).toStrictEqual({
      prNumber: 123,
      prUrl: existingPullRequest.url,
      isDraft: false,
    })
    expect(runGh.mock.calls).toStrictEqual([[lookupArguments]])
  })

  it('reconciles a retry after the create response was lost', () => {
    const runGh = vi
      .fn<(args: readonly string[]) => string>()
      .mockReturnValueOnce('[]')
      .mockImplementationOnce(() => {
        throw new GithubFailure('network response lost')
      })
      .mockReturnValueOnce(JSON.stringify([existingPullRequest]))
    const createPullRequest = createGithubPullRequestClient(runGh)

    expect(() => createPullRequest(creationRequest)).toThrow('network response lost')
    expect(createPullRequest(creationRequest)).toStrictEqual({
      prNumber: 123,
      prUrl: existingPullRequest.url,
      isDraft: false,
    })
    expect(runGh.mock.calls).toStrictEqual([
      [lookupArguments],
      [createArguments],
      [lookupArguments],
    ])
  })

  it('rejects ambiguous open PRs before creating anything', () => {
    const runGh = vi
      .fn<(args: readonly string[]) => string>()
      .mockReturnValue(
        JSON.stringify([existingPullRequest, { ...existingPullRequest, number: 456 }]),
      )

    expect(() => createGithubPullRequestClient(runGh)(creationRequest)).toThrow(
      'Expected at most one open PR for branch issue-42. Got multiple PRs.',
    )
    expect(runGh.mock.calls).toStrictEqual([[lookupArguments]])
  })

  it('propagates lookup failures without attempting creation', () => {
    const runGh = vi.fn<(args: readonly string[]) => string>().mockImplementation(() => {
      throw new GithubFailure('GitHub authentication failed')
    })

    expect(() => createGithubPullRequestClient(runGh)(creationRequest)).toThrow(
      'GitHub authentication failed',
    )
    expect(runGh.mock.calls).toStrictEqual([[lookupArguments]])
  })

  it.each([
    ['', 'Expected gh pr create to return a URL. Got empty output.'],
    ['not-json', 'Expected gh pr create to return a URL. Got: not-json'],
  ])('rejects invalid create output %j', (output, reason) => {
    const runGh = vi
      .fn<(args: readonly string[]) => string>()
      .mockReturnValueOnce('[]')
      .mockReturnValueOnce(output)

    expect(() => createGithubPullRequestClient(runGh)(creationRequest)).toThrow(reason)
    expect(runGh.mock.calls).toStrictEqual([[lookupArguments], [createArguments]])
  })
})
