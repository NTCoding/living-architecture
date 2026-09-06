import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { readGithubCodeRabbitStatus } from './get-coderabbit-status'

const repository = 'NTCoding/living-architecture'
const headRevision = 'a'.repeat(40)
const evidenceUrl = `https://api.github.com/repos/${repository}/statuses/${headRevision}`
const status = {
  id: 100,
  context: 'CodeRabbit',
  state: 'success',
  description: 'Review completed',
  url: evidenceUrl,
  creator: { id: 136622811, node_id: 'BOT_kgDOCCSy2w', type: 'Bot', login: 'coderabbitai[bot]' },
}

function readStatus(pages: readonly (readonly object[])[]) {
  return readGithubCodeRabbitStatus(() => JSON.stringify(pages), repository, headRevision)
}

describe('installed CodeRabbit status contract', () => {
  it.each([
    ['initial', repository, 'a3333250757fdbb57133090131abd44a62bfd60c', 'completed', 53597459425],
    [
      'no-findings',
      repository,
      '0a6189befc968025e8afd3cba4f449bbdedc26a1',
      'completed',
      53602067177,
    ],
    [
      'incremental',
      repository,
      '494915f01c69da8054a689ab8317a6388d90bb78',
      'completed',
      53599666567,
    ],
    [
      'rate-limited',
      'NTCoding/deterministic-agent-workflows',
      '24bf0adec792b07c3118ff956be7c09e35cd6ef5',
      'rate-limited',
      53612662582,
    ],
  ] as const)('recognises the recorded %s payload', (fixture, repo, head, type, statusId) => {
    const body = readFileSync(
      new URL(`./__fixtures__/coderabbit-${fixture}.json`, import.meta.url),
      'utf8',
    )
    const runGh = vi.fn<(arguments_: readonly string[]) => string>().mockReturnValue(`[${body}]`)

    expect(readGithubCodeRabbitStatus(runGh, repo, head)).toStrictEqual({
      type,
      statusId,
      evidenceUrl: `https://api.github.com/repos/${repo}/statuses/${head}`,
    })
    expect(runGh.mock.calls).toStrictEqual([
      [['api', '--paginate', '--slurp', `repos/${repo}/commits/${head}/statuses?per_page=100`]],
    ])
  })

  it('does not infer completion from absence of statuses or unrelated checks', () => {
    expect(readStatus([])).toStrictEqual({ type: 'pending' })
    expect(readStatus([[{ ...status, context: 'another-provider' }]])).toStrictEqual({
      type: 'pending',
    })
  })

  it.each([
    null,
    { ...status.creator, id: 1 },
    { ...status.creator, node_id: 'another-actor' },
    { ...status.creator, type: 'User' },
  ])('rejects an unverified creator %j even with a matching login', (creator) => {
    expect(readStatus([[{ ...status, creator }]])).toStrictEqual({
      type: 'unsupported',
      reason: 'CodeRabbit status identity or revision could not be verified.',
    })
  })

  it('uses immutable identity rather than the display login', () => {
    expect(
      readStatus([[{ ...status, creator: { ...status.creator, login: 'renamed-bot' } }]]),
    ).toStrictEqual({
      type: 'completed',
      statusId: 100,
      evidenceUrl,
    })
  })

  it.each([
    `https://api.github.com/repos/${repository}/statuses/${'b'.repeat(40)}`,
    `https://api.github.com/repos/another/repository/statuses/${headRevision}`,
    `https://untrusted.example/repos/${repository}/statuses/${headRevision}`,
  ])('rejects a mismatched evidence URL %s', (url) => {
    expect(readStatus([[{ ...status, url }]]).type).toBe('unsupported')
  })

  it('does not reuse completion when a newer review is pending', () => {
    expect(
      readStatus([
        [status],
        [{ ...status, id: 101, state: 'pending', description: 'Review queued' }],
      ]),
    ).toStrictEqual({ type: 'pending' })
  })

  it.each(['error', 'failure'])('does not treat %s as successful completion', (state) => {
    expect(readStatus([[{ ...status, state }]])).toStrictEqual({
      type: 'failed',
      statusId: 100,
      evidenceUrl,
    })
  })

  it.each([null, 'Review approved', 'future completion format'])(
    'fails closed for an undemonstrated terminal description %j',
    (description) => {
      expect(readStatus([[{ ...status, description }]])).toStrictEqual({
        type: 'unsupported',
        reason: `Unrecognised CodeRabbit completion: ${String(description)}.`,
      })
    },
  )

  it('preserves verified rate-limit evidence from any page even after later completion', () => {
    expect(
      readStatus([[status], [{ ...status, id: 99, description: 'Review rate limited' }]]),
    ).toStrictEqual({
      type: 'rate-limited',
      statusId: 99,
      evidenceUrl,
    })
  })

  it('does not allow a spoofed rate limit to enable skipping', () => {
    expect(
      readStatus([
        [{ ...status, description: 'Review rate limited', creator: { ...status.creator, id: 1 } }],
      ]).type,
    ).toBe('unsupported')
  })

  it('rejects malformed API payloads', () => {
    expect(() => readStatus([[{ ...status, state: 'unknown-state' }]])).toThrow(
      'Invalid enum value',
    )
  })
})
