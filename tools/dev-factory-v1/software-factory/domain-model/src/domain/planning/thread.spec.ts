import { describe, expect, it } from 'vitest'
import { InvalidThread, Thread } from './thread'

const fields = {
  id: 'c-3',
  document: 'problem-definition.md',
  anchor: {
    selectedText: 'every repository',
    prefix: 'Merge the graphs from ',
    suffix: ' into one view',
    firstLine: 14,
    occurrence: 0,
  },
  messages: [
    {
      author: 'nick',
      time: '2026-11-26T10:02:11Z',
      text: 'Does this include private repositories?',
    },
  ],
  outcome: null,
}

describe('Thread', () => {
  it('waits for the agent once Nick has written', () => {
    expect(Thread.from(fields).waitsFor()).toBe('agent')
  })

  it('waits for Nick once the agent has replied', () => {
    const thread = Thread.from(fields).replying({
      author: 'agent',
      time: '2026-11-26T10:04:40Z',
      text: 'Yes. I have added a requirement about private repositories.',
    })

    expect(thread.waitsFor()).toBe('nick')
    expect(thread.messages()).toHaveLength(2)
  })

  it('keeps the passage it sits beside', () => {
    const thread = Thread.from(fields)

    expect(thread.id()).toBe('c-3')
    expect(thread.document()).toBe('problem-definition.md')
    expect(thread.anchor().selectedText).toBe('every repository')
  })

  it('closes when Nick resolves it', () => {
    const thread = Thread.from(fields)
      .replying({ author: 'agent', time: '2026-11-26T10:04:40Z', text: 'Yes.' })
      .resolved({ closedBy: 'nick', time: '2026-11-26T11:00:00Z' })

    expect(thread.outcome()).toStrictEqual({
      closedBy: 'nick',
      time: '2026-11-26T11:00:00Z',
    })
    expect(thread.waitsFor()).toBe('nobody')
  })

  it('refuses to close a thread that the agent has not answered', () => {
    expect(() => Thread.from(fields).resolved({ closedBy: 'nick', time: 'now' })).toThrow(
      'waits for the agent',
    )
  })

  it('refuses to close a thread twice', () => {
    const closed = Thread.from(fields)
      .replying({ author: 'agent', time: '2026-11-26T10:04:40Z', text: 'Yes.' })
      .resolved({ closedBy: 'agent', time: '2026-11-26T11:00:00Z' })

    expect(() => closed.resolved({ closedBy: 'nick', time: 'now' })).toThrow('already closed')
  })

  it('refuses a reply to a closed thread', () => {
    const closed = Thread.from(fields)
      .replying({ author: 'agent', time: '2026-11-26T10:04:40Z', text: 'Yes.' })
      .resolved({ closedBy: 'nick', time: '2026-11-26T11:00:00Z' })

    expect(() => closed.replying({ author: 'nick', time: 'now', text: 'One more thing.' })).toThrow(
      'cannot be replied to',
    )
  })

  it('rejects an id that is not a comment thread', () => {
    expect(() => Thread.from({ ...fields, id: 'd-3' })).toThrow('looks like c-1')
  })

  it('rejects a thread with nothing selected', () => {
    expect(() =>
      Thread.from({ ...fields, anchor: { ...fields.anchor, selectedText: '  ' } }),
    ).toThrow('nothing selected')
  })

  it('rejects a thread with no messages', () => {
    expect(() => Thread.from({ ...fields, messages: [] })).toThrow('no messages')
  })

  it('rejects a message with no text', () => {
    expect(() =>
      Thread.from({ ...fields, messages: [{ author: 'nick', time: 'now', text: ' ' }] }),
    ).toThrow('has no text')
  })

  it('rejects a message with no time', () => {
    expect(() =>
      Thread.from({ ...fields, messages: [{ author: 'nick', time: '', text: 'Hello.' }] }),
    ).toThrow('has no time')
  })

  it('rejects a message from nobody the factory knows', () => {
    expect(() =>
      Thread.from({ ...fields, messages: [{ author: 'ghost', time: 'now', text: 'Hello.' }] }),
    ).toThrow('is from ghost')
  })

  it('rejects an outcome from nobody the factory knows', () => {
    expect(() => Thread.from({ ...fields, outcome: { closedBy: 'ghost', time: 'now' } })).toThrow(
      'was closed by ghost',
    )
  })

  it('rejects an outcome with no time', () => {
    expect(() => Thread.from({ ...fields, outcome: { closedBy: 'nick', time: ' ' } })).toThrow(
      'closed without a time',
    )
  })

  it('says why a thread cannot be closed twice', () => {
    expect(new InvalidThread('The thread c-3 is already closed.').message).toBe(
      'The thread c-3 is already closed.',
    )
  })
})
