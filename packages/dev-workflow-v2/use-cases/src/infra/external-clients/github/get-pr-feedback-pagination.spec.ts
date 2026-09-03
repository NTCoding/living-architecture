import { expect, it, vi } from 'vitest'
import { createGithubPullRequestFeedbackClient } from './get-pr-feedback'

const REPO_INFO = JSON.stringify({
  owner: { login: 'TestOwner' },
  name: 'test-repo',
})
const NO_NEXT_PAGE = {
  hasNextPage: false,
  endCursor: null,
}

interface PageInfo {
  readonly hasNextPage: boolean
  readonly endCursor: string | null
}

function initialResponse(): string {
  return JSON.stringify({
    data: {
      repository: {
        pullRequest: {
          reviewDecision: null,
          reviews: {
            nodes: [review('reviewer', 'COMMENTED', 'first review')],
            pageInfo: {
              hasNextPage: true,
              endCursor: 'review-page-1',
            },
          },
          reviewThreads: {
            nodes: [
              thread('thread-1', {
                hasNextPage: true,
                endCursor: 'comment-page-1',
              }),
            ],
            pageInfo: {
              hasNextPage: true,
              endCursor: 'thread-page-1',
            },
          },
        },
      },
    },
  })
}

function review(
  login: string,
  state: string,
  body: string,
  submittedAt = '2026-09-03T10:00:00Z',
): object {
  return {
    author: { login },
    body,
    state,
    submittedAt,
  }
}

function thread(id: string, pageInfo: PageInfo = NO_NEXT_PAGE): object {
  return {
    id,
    isResolved: false,
    isOutdated: false,
    path: 'src/example.ts',
    line: 1,
    comments: {
      nodes: [
        {
          author: { login: 'reviewer' },
          body: 'first comment',
          createdAt: '2026-09-03T10:00:00Z',
        },
      ],
      pageInfo,
    },
  }
}

function rateLimitedThread(id: string, isResolved: boolean, isOutdated: boolean): object {
  return {
    id,
    isResolved,
    isOutdated,
    path: 'src/example.ts',
    line: 1,
    comments: {
      nodes: [
        {
          author: { login: 'coderabbitai[bot]' },
          body: 'Review rate limited. Try again later.',
          createdAt: '2026-09-03T10:00:00Z',
        },
      ],
      pageInfo: NO_NEXT_PAGE,
    },
  }
}

it('reads every page of reviews, threads, and thread comments', () => {
  const runGh = vi.fn((ghArguments: readonly string[]) => {
    if (ghArguments[0] === 'repo') return REPO_INFO
    const query = ghArguments[3]
    if (query?.includes('after: "review-page-1"')) {
      return JSON.stringify({
        data: {
          repository: {
            pullRequest: {
              reviews: {
                nodes: [review('coderabbitai[bot]', 'APPROVED', 'complete')],
                pageInfo: NO_NEXT_PAGE,
              },
            },
          },
        },
      })
    }
    if (query?.includes('after: "thread-page-1"')) {
      return JSON.stringify({
        data: {
          repository: {
            pullRequest: {
              reviewThreads: {
                nodes: [thread('thread-2')],
                pageInfo: NO_NEXT_PAGE,
              },
            },
          },
        },
      })
    }
    if (query?.includes('node(id: "thread-1")')) {
      return JSON.stringify({
        data: {
          node: {
            comments: {
              nodes: [
                {
                  author: { login: 'reviewer' },
                  body: 'second comment',
                  createdAt: '2026-09-03T10:01:00Z',
                },
              ],
              pageInfo: NO_NEXT_PAGE,
            },
          },
        },
      })
    }
    return initialResponse()
  })

  const feedback = createGithubPullRequestFeedbackClient(runGh)(1)

  expect(feedback.coderabbitReviewSeen).toBe(true)
  expect(feedback.threads.map((value) => value.id)).toStrictEqual(['thread-1', 'thread-2'])
  expect(feedback.threads[0]?.comments).toHaveLength(2)
})

it('clears a prior CodeRabbit rate limit when newer active feedback succeeds', () => {
  const rateLimited = JSON.stringify({
    data: {
      repository: {
        pullRequest: {
          reviewDecision: null,
          reviews: {
            nodes: [
              review('coderabbitai[bot]', 'COMMENTED', 'Review rate limited. Try again later.'),
              review('coderabbitai[bot]', 'COMMENTED', 'Review complete.', '2026-09-03T09:00:00Z'),
            ],
            pageInfo: NO_NEXT_PAGE,
          },
          reviewThreads: {
            nodes: [],
            pageInfo: NO_NEXT_PAGE,
          },
        },
      },
    },
  })
  const successful = JSON.stringify({
    data: {
      repository: {
        pullRequest: {
          reviewDecision: null,
          reviews: {
            nodes: [review('coderabbitai[bot]', 'APPROVED', 'Review complete.')],
            pageInfo: NO_NEXT_PAGE,
          },
          reviewThreads: {
            nodes: [],
            pageInfo: NO_NEXT_PAGE,
          },
        },
      },
    },
  })
  const runGh = vi.fn().mockReturnValue(REPO_INFO)
  runGh.mockReturnValueOnce(REPO_INFO).mockReturnValueOnce(rateLimited)
  runGh.mockReturnValueOnce(REPO_INFO).mockReturnValueOnce(successful)
  const getPrFeedback = createGithubPullRequestFeedbackClient(runGh)

  expect(getPrFeedback(1).coderabbitRateLimited).toBe(true)
  expect(getPrFeedback(1).coderabbitRateLimited).toBe(false)
})

it('rejects an incomplete GitHub pagination cursor', () => {
  const response = JSON.stringify({
    data: {
      repository: {
        pullRequest: {
          reviewDecision: null,
          reviews: {
            nodes: [],
            pageInfo: {
              hasNextPage: true,
              endCursor: null,
            },
          },
          reviewThreads: {
            nodes: [],
            pageInfo: NO_NEXT_PAGE,
          },
        },
      },
    },
  })
  const runGh = vi.fn().mockReturnValueOnce(REPO_INFO).mockReturnValueOnce(response)

  expect(() => createGithubPullRequestFeedbackClient(runGh)(1)).toThrow(
    'Expected a cursor for the next GitHub GraphQL page.',
  )
})

it('ignores rate limits in resolved and outdated CodeRabbit threads', () => {
  const response = JSON.stringify({
    data: {
      repository: {
        pullRequest: {
          reviewDecision: null,
          reviews: {
            nodes: [],
            pageInfo: NO_NEXT_PAGE,
          },
          reviewThreads: {
            nodes: [
              rateLimitedThread('resolved-thread', true, false),
              rateLimitedThread('outdated-thread', false, true),
            ],
            pageInfo: NO_NEXT_PAGE,
          },
        },
      },
    },
  })
  const runGh = vi.fn().mockReturnValueOnce(REPO_INFO).mockReturnValueOnce(response)

  expect(createGithubPullRequestFeedbackClient(runGh)(1).coderabbitRateLimited).toBe(false)
})
