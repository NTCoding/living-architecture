import { describe, expect, it } from 'vitest'
import { Decision, InvalidDecision } from './decision'

const answer = {
  choice: 'proposal',
  chosen: 'Write one merged graph file per workspace.',
  reply: null,
  time: '2026-11-27T09:41:00Z',
}

function openDecision(): Decision {
  return Decision.from({
    id: 'd-2',
    document: 'ARCH.md',
    question: 'Will the merged graph be written to one file?',
    answer: null,
    followed: false,
    outcome: null,
  })
}

describe('Decision', () => {
  it('waits for Nick until it is answered', () => {
    expect(openDecision().waitsFor()).toBe('nick')
  })

  it('takes one answer and then waits for the agent', () => {
    const answered = openDecision().answered(answer)

    expect([answered.waitsFor(), answered.answer()?.choice()]).toStrictEqual(['agent', 'proposal'])
    expect(answered.answer()?.chosen()).toBe('Write one merged graph file per workspace.')
    expect(answered.answer()?.time()).toBe('2026-11-27T09:41:00Z')
  })

  it('refuses a second answer', () => {
    const answered = openDecision().answered(answer)

    expect(() => answered.answered(answer)).toThrow(
      new InvalidDecision('The decision d-2 has already been answered.'),
    )
  })

  it('closes once the agent has followed the answer', () => {
    const followed = openDecision().answered(answer).followed('2026-11-27T10:02:00Z')

    expect(followed.isFollowed()).toBe(true)
    expect(followed.outcome()).toStrictEqual({
      closedBy: 'agent',
      time: '2026-11-27T10:02:00Z',
    })
    expect(followed.waitsFor()).toBe('nobody')
  })

  it('refuses to be followed before it is answered', () => {
    expect(() => openDecision().followed('2026-11-27T10:02:00Z')).toThrow(
      new InvalidDecision('The decision d-2 has no answer, so the agent cannot follow it.'),
    )
  })

  it('refuses to be closed twice', () => {
    const followed = openDecision().answered(answer).followed('2026-11-27T10:02:00Z')

    expect(() => followed.followed('2026-11-27T10:03:00Z')).toThrow(
      new InvalidDecision('The decision d-2 is already closed.'),
    )
  })

  it('refuses a follow with no time', () => {
    expect(() => openDecision().answered(answer).followed('')).toThrow(
      new InvalidDecision('The decision d-2 was followed without a time.'),
    )
  })

  it('refuses an id that is not a decision id', () => {
    expect(() =>
      Decision.from({
        id: 'c-3',
        document: 'ARCH.md',
        question: 'Will the merged graph be written to one file?',
        answer: null,
        followed: false,
        outcome: null,
      }),
    ).toThrow(new InvalidDecision('A decision id looks like d-1: c-3'))
  })

  it('refuses a decision with no question', () => {
    expect(() =>
      Decision.from({
        id: 'd-2',
        document: 'ARCH.md',
        question: '  ',
        answer: null,
        followed: false,
        outcome: null,
      }),
    ).toThrow(new InvalidDecision('The decision d-2 has no question.'))
  })

  it('refuses an outcome with no time', () => {
    expect(() =>
      Decision.from({
        id: 'd-2',
        document: 'ARCH.md',
        question: 'Will the merged graph be written to one file?',
        answer,
        followed: true,
        outcome: { closedBy: 'agent', time: ' ' },
      }),
    ).toThrow(new InvalidDecision('The decision d-2 was closed without a time.'))
  })

  it('reads a decision that has been followed', () => {
    const decision = Decision.from({
      id: 'd-2',
      document: 'ARCH.md',
      question: 'Will the merged graph be written to one file?',
      answer,
      followed: true,
      outcome: { closedBy: 'agent', time: '2026-11-27T10:02:00Z' },
    })

    expect([decision.id(), decision.document(), decision.question()]).toStrictEqual([
      'd-2',
      'ARCH.md',
      'Will the merged graph be written to one file?',
    ])
    expect(decision.isFollowed()).toBe(true)
  })
})
