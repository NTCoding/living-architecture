import { afterEach, describe, expect, it, vi } from 'vitest'
import { isMapping, postJson, readJson, ReadFailed } from './read-json'

afterEach(() => {
  vi.unstubAllGlobals()
})

function answerOf(answer: {
  readonly ok: boolean
  readonly status: number
  readonly body: unknown
}): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: answer.ok,
        status: answer.status,
        json: () => Promise.resolve(answer.body),
      }),
    ),
  )
}

describe('readJson', () => {
  it('reads the answer of the server', async () => {
    answerOf({ ok: true, status: 200, body: { ideas: [] } })

    expect(await readJson('/api/overview-board', isMapping)).toStrictEqual({ ideas: [] })
  })

  it('says which path failed and with what status', async () => {
    answerOf({ ok: false, status: 500, body: {} })

    await expect(readJson('/api/overview-board', isMapping)).rejects.toThrow(
      new ReadFailed('/api/overview-board', 500),
    )
  })

  it('refuses an answer that is not the shape it expected', async () => {
    answerOf({ ok: true, status: 200, body: [1, 2] })

    await expect(readJson('/api/overview-board', isMapping)).rejects.toThrow(
      new ReadFailed('/api/overview-board', 200),
    )
  })
})

describe('postJson', () => {
  it('sends the body and reads the answer', async () => {
    const sent = vi.fn(() =>
      Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ thread: 'c-1' }) }),
    )
    vi.stubGlobal('fetch', sent)

    expect(await postJson('/api/epics/one/threads', { text: 'Why?' }, isMapping)).toStrictEqual({
      thread: 'c-1',
    })
    expect(sent).toHaveBeenCalledWith('/api/epics/one/threads', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"text":"Why?"}',
    })
  })

  it('says which path failed and with what status', async () => {
    answerOf({ ok: false, status: 500, body: {} })

    await expect(postJson('/api/ideas', {}, isMapping)).rejects.toThrow(
      new ReadFailed('/api/ideas', 500),
    )
  })

  it('refuses an answer that is not the shape it expected', async () => {
    answerOf({ ok: true, status: 201, body: [1, 2] })

    await expect(postJson('/api/ideas', {}, isMapping)).rejects.toThrow(
      new ReadFailed('/api/ideas', 201),
    )
  })
})
