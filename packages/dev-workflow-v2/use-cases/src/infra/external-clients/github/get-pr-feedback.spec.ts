import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createGithubPullRequestFeedbackClient } from './get-pr-feedback'

const headRevision = 'a3333250757fdbb57133090131abd44a62bfd60c'
const repository = { owner: { login: 'NTCoding' }, name: 'living-architecture' }
const noNextPage = { hasNextPage: false, endCursor: null }
const comment = {
  author: { login: 'reviewer' },
  body: 'Please change this.',
  url: 'https://github.com/NTCoding/living-architecture/pull/525#discussion_r1',
}
const thread = {
  id: 'thread-1',
  isResolved: false,
  isOutdated: false,
  path: 'src/example.ts',
  line: 1,
  comments: { nodes: [comment], pageInfo: noNextPage },
}

function initialResponse(
  threads: readonly object[],
  pageInfo: { readonly hasNextPage: boolean; readonly endCursor: string | null } = noNextPage,
) {
  return {
    data: {
      repository: {
        pullRequest: {
          headRefOid: headRevision,
          reviewDecision: 'CHANGES_REQUESTED',
          reviewThreads: { nodes: threads, pageInfo },
        },
      },
    },
  }
}

function createRunner(threads: readonly object[], finalHead = headRevision) {
  return vi
    .fn<(arguments_: readonly string[]) => string>()
    .mockReturnValueOnce(JSON.stringify(repository))
    .mockReturnValueOnce(JSON.stringify(initialResponse(threads)))
    .mockReturnValueOnce('[[]]')
    .mockReturnValueOnce(JSON.stringify({ headRefOid: finalHead }))
}

describe('createGithubPullRequestFeedbackClient', () => {
  it('does not infer review completion from an empty thread list', () => {
    const runGh = createRunner([])
    expect(createGithubPullRequestFeedbackClient(runGh)(525)).toStrictEqual({
      repository: 'NTCoding/living-architecture',
      headRevision,
      reviewDecision: 'CHANGES_REQUESTED',
      codeRabbitStatus: { type: 'pending' },
      unresolvedCount: 0,
      threads: [],
    })
    expect(runGh.mock.calls).toStrictEqual([
      [['repo', 'view', '--json', 'owner,name']],
      [
        [
          'api',
          'graphql',
          '-f',
          expect.stringContaining('owner: "NTCoding", name: "living-architecture"'),
        ],
      ],
      [
        [
          'api',
          '--paginate',
          '--slurp',
          `repos/NTCoding/living-architecture/commits/${headRevision}/statuses?per_page=100`,
        ],
      ],
      [['pr', 'view', '525', '--json', 'headRefOid']],
    ])
  })

  it('counts every unresolved thread, including outdated threads', () => {
    const threads = [
      thread,
      { ...thread, id: 'resolved', isResolved: true },
      { ...thread, id: 'outdated', isOutdated: true },
    ]
    const feedback = createGithubPullRequestFeedbackClient(createRunner(threads))(525)
    expect(feedback.unresolvedCount).toBe(2)
    expect(feedback.threads.map((item) => item.id)).toStrictEqual(['thread-1', 'outdated'])
    expect(feedback.threads[0]?.comments).toStrictEqual([comment])
  })

  it('preserves deleted authors, missing URLs and missing diff locations', () => {
    const anonymous = { author: null, body: 'Follow-up without a URL.' }
    const feedback = createGithubPullRequestFeedbackClient(
      createRunner([
        {
          ...thread,
          path: null,
          line: null,
          comments: { nodes: [anonymous], pageInfo: noNextPage },
        },
      ]),
    )(525)
    expect(feedback.threads[0]).toStrictEqual({
      ...thread,
      path: null,
      line: null,
      comments: [anonymous],
    })
  })

  it('does not recognise rate limits from comment text or a matching login', () => {
    const spoofedComment = { author: { login: 'coderabbitai[bot]' }, body: 'Review rate limited' }
    const feedback = createGithubPullRequestFeedbackClient(
      createRunner([{ ...thread, comments: { nodes: [spoofedComment], pageInfo: noNextPage } }]),
    )(525)
    expect(feedback.codeRabbitStatus).toStrictEqual({ type: 'pending' })
    expect(feedback.unresolvedCount).toBe(1)
  })

  it('reads demonstrated completion for the exact head independently of thread findings', () => {
    const payload = readFileSync(
      new URL('./__fixtures__/coderabbit-initial.json', import.meta.url),
      'utf8',
    )
    const runGh = vi
      .fn<(arguments_: readonly string[]) => string>()
      .mockReturnValueOnce(JSON.stringify(repository))
      .mockReturnValueOnce(JSON.stringify(initialResponse([thread])))
      .mockReturnValueOnce(`[${payload}]`)
      .mockReturnValueOnce(JSON.stringify({ headRefOid: headRevision }))

    const feedback = createGithubPullRequestFeedbackClient(runGh)(525)
    expect(feedback.codeRabbitStatus).toStrictEqual({
      type: 'completed',
      statusId: 53597459425,
      evidenceUrl: `https://api.github.com/repos/NTCoding/living-architecture/statuses/${headRevision}`,
    })
    expect(feedback.unresolvedCount).toBe(1)
  })

  it('rejects a head change during feedback collection', () => {
    expect(() =>
      createGithubPullRequestFeedbackClient(createRunner([], 'b'.repeat(40)))(525),
    ).toThrow('PR head changed while reading feedback.')
  })

  it.each([
    ['not json', 'Unexpected token'],
    [JSON.stringify({ wrong: 'shape' }), 'Required'],
  ])('rejects malformed GraphQL output %s', (response, reason) => {
    const runGh = vi
      .fn<(arguments_: readonly string[]) => string>()
      .mockReturnValueOnce(JSON.stringify(repository))
      .mockReturnValueOnce(response)
    expect(() => createGithubPullRequestFeedbackClient(runGh)(525)).toThrow(reason)
    expect(runGh).toHaveBeenCalledTimes(2)
  })

  it('reads all pages of threads and comments before evaluating feedback', () => {
    const first = initialResponse(
      [
        {
          ...thread,
          comments: {
            nodes: [comment],
            pageInfo: { hasNextPage: true, endCursor: 'comment-page-1' },
          },
        },
      ],
      { hasNextPage: true, endCursor: 'thread-page-1' },
    )
    const secondThreads = {
      data: {
        repository: {
          pullRequest: {
            reviewThreads: {
              nodes: [{ ...thread, id: 'thread-2' }],
              pageInfo: noNextPage,
            },
          },
        },
      },
    }
    const secondComments = {
      data: {
        node: {
          comments: { nodes: [{ ...comment, body: 'second comment' }], pageInfo: noNextPage },
        },
      },
    }
    const runGh = vi
      .fn<(arguments_: readonly string[]) => string>()
      .mockReturnValueOnce(JSON.stringify(repository))
      .mockReturnValueOnce(JSON.stringify(first))
      .mockReturnValueOnce(JSON.stringify(secondThreads))
      .mockReturnValueOnce(JSON.stringify(secondComments))
      .mockReturnValueOnce('[[]]')
      .mockReturnValueOnce(JSON.stringify({ headRefOid: headRevision }))

    const feedback = createGithubPullRequestFeedbackClient(runGh)(525)
    expect(feedback.threads.map((item) => item.id)).toStrictEqual(['thread-1', 'thread-2'])
    expect(feedback.threads[0]?.comments).toStrictEqual([
      comment,
      { ...comment, body: 'second comment' },
    ])
    expect(runGh.mock.calls[2]).toStrictEqual([
      ['api', 'graphql', '-f', expect.stringContaining('after: "thread-page-1"')],
    ])
    expect(runGh.mock.calls[3]).toStrictEqual([
      ['api', 'graphql', '-f', expect.stringContaining('after: "comment-page-1"')],
    ])
  })

  it.each(['threads', 'comments'])('rejects a missing cursor for %s', (connection) => {
    const invalid = { hasNextPage: true, endCursor: null }
    const initial =
      connection === 'threads'
        ? initialResponse([], invalid)
        : initialResponse([{ ...thread, comments: { nodes: [comment], pageInfo: invalid } }])
    const runGh = vi
      .fn<(arguments_: readonly string[]) => string>()
      .mockReturnValueOnce(JSON.stringify(repository))
      .mockReturnValueOnce(JSON.stringify(initial))
    expect(() => createGithubPullRequestFeedbackClient(runGh)(525)).toThrow(
      'Expected a cursor for the next GitHub GraphQL page.',
    )
    expect(runGh).toHaveBeenCalledTimes(2)
  })

  it.each(['threads', 'comments'])(
    'rejects a repeated cursor for %s rather than looping',
    (connection) => {
      const repeated = { hasNextPage: true, endCursor: 'repeated-cursor' }
      const initial =
        connection === 'threads'
          ? initialResponse([], repeated)
          : initialResponse([{ ...thread, comments: { nodes: [comment], pageInfo: repeated } }])
      const page =
        connection === 'threads'
          ? {
              data: {
                repository: { pullRequest: { reviewThreads: { nodes: [], pageInfo: repeated } } },
              },
            }
          : { data: { node: { comments: { nodes: [], pageInfo: repeated } } } }
      const runGh = vi
        .fn<(arguments_: readonly string[]) => string>()
        .mockReturnValueOnce(JSON.stringify(repository))
        .mockReturnValueOnce(JSON.stringify(initial))
        .mockReturnValueOnce(JSON.stringify(page))
      expect(() => createGithubPullRequestFeedbackClient(runGh)(525)).toThrow(
        'GitHub repeated a pagination cursor.',
      )
      expect(runGh).toHaveBeenCalledTimes(3)
    },
  )
})

it('does not poll CodeRabbit when only current-head threads were requested', () => {
  const runGh = vi
    .fn<(arguments_: readonly string[]) => string>()
    .mockReturnValueOnce(JSON.stringify(repository))
    .mockReturnValueOnce(JSON.stringify(initialResponse([thread])))
    .mockReturnValueOnce(JSON.stringify({ headRefOid: headRevision }))
  const feedback = createGithubPullRequestFeedbackClient(runGh)(525, {
    includeCodeRabbitStatus: false,
  })
  expect(feedback.codeRabbitStatus).toStrictEqual({ type: 'not-requested' })
  expect(feedback.unresolvedCount).toBe(1)
  expect(runGh).toHaveBeenCalledTimes(3)
  expect(runGh).toHaveBeenLastCalledWith(['pr', 'view', '525', '--json', 'headRefOid'])
})
