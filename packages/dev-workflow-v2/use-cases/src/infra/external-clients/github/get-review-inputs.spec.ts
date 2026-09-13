import { describe, expect, it } from 'vitest'
import { createGithubReviewInputsClient } from './get-review-inputs'

type Page = { readonly hasNextPage: boolean; readonly endCursor: string | null }
const lastPage: Page = { hasNextPage: false, endCursor: null }
const nextPage = (cursor: string): Page => ({ hasNextPage: true, endCursor: cursor })
const issue = (number: number) => ({
  number,
  url: `https://example.test/issues/${number}`,
  title: `Issue ${number}`,
  body: `Body ${number}`,
})
const comment = (body: string) => ({ author: { login: 'agent' }, body, databaseId: 10 })
const thread = (
  id: string,
  comments: readonly ReturnType<typeof comment>[],
  pageInfo: Page = lastPage,
) => ({
  id,
  isResolved: false,
  isOutdated: false,
  path: 'file.ts',
  line: 4,
  comments: { nodes: comments, pageInfo },
})
const response = (
  issues: readonly ReturnType<typeof issue>[],
  issuePage: Page,
  threads: readonly ReturnType<typeof thread>[],
  threadPage: Page,
  comments: readonly ReturnType<typeof comment>[],
  commentPage: Page,
) =>
  JSON.stringify({
    data: {
      repository: {
        pullRequest: {
          closingIssuesReferences: { nodes: issues, pageInfo: issuePage },
          reviewThreads: { nodes: threads, pageInfo: threadPage },
          comments: { nodes: comments, pageInfo: commentPage },
        },
      },
    },
  })
const threadResponse = (comments: readonly ReturnType<typeof comment>[], pageInfo: Page) =>
  JSON.stringify({ data: { node: { comments: { nodes: comments, pageInfo } } } })
const pullRequest = JSON.stringify({
  number: 42,
  url: 'https://example.test/pull/42',
  title: 'Review inputs',
  body: 'PR body',
  base: { ref: 'main', sha: 'base' },
  head: { sha: 'head' },
})
const repository = JSON.stringify({ owner: { login: 'example' }, name: 'repository' })

class UnexpectedGithubRequestError extends Error {}

describe('createGithubReviewInputsClient', () => {
  it('returns stable pull request inputs after paginating issues, threads, thread comments, and decision comments', () => {
    const graphqlResponses = [
      response(
        [issue(1)],
        nextPage('issues'),
        [thread('thread-1', [comment('thread one')], nextPage('thread-comments'))],
        nextPage('threads'),
        [comment('[main-agent] first')],
        nextPage('comments'),
      ),
      response([], lastPage, [thread('thread-2', [comment('thread two')])], lastPage, [], lastPage),
      response([issue(2)], lastPage, [], lastPage, [], lastPage),
      threadResponse([comment('thread one continued')], lastPage),
      response(
        [],
        lastPage,
        [],
        lastPage,
        [comment('[main-agent] second'), comment('ordinary')],
        lastPage,
      ),
    ]
    const calls: string[][] = []
    const runGh = (argumentsList: readonly string[]) => {
      calls.push([...argumentsList])
      if (argumentsList[0] === 'repo') return repository
      if (argumentsList[1]?.startsWith('repos/')) return pullRequest
      const value = graphqlResponses.shift()
      if (value === undefined) throw new UnexpectedGithubRequestError()
      return value
    }

    expect(createGithubReviewInputsClient(runGh)(42)).toStrictEqual({
      pr: {
        number: 42,
        url: 'https://example.test/pull/42',
        title: 'Review inputs',
        body: 'PR body',
        baseRef: 'main',
        baseCommit: 'base',
        headCommit: 'head',
      },
      linkedIssues: [issue(1), issue(2)],
      reviewThreads: [
        {
          ...thread('thread-1', [], lastPage),
          comments: [comment('thread one'), comment('thread one continued')],
        },
        { ...thread('thread-2', [], lastPage), comments: [comment('thread two')] },
      ],
      decisionHistory: [comment('[main-agent] first'), comment('[main-agent] second')],
    })
    expect(calls).toHaveLength(7)
  })

  it('rejects incomplete pagination when GitHub omits a cursor', () => {
    const runGh = (argumentsList: readonly string[]) => {
      if (argumentsList[0] === 'repo') return repository
      if (argumentsList[1]?.startsWith('repos/')) return pullRequest
      return response([], { hasNextPage: true, endCursor: null }, [], lastPage, [], lastPage)
    }

    expect(() => createGithubReviewInputsClient(runGh)(42)).toThrow(
      'GitHub pagination was incomplete: next page cursor absent.',
    )
  })

  it('rejects malformed GitHub responses', () => {
    expect(() => createGithubReviewInputsClient(() => '{}')(42)).toThrow(/Required/)
  })
})
