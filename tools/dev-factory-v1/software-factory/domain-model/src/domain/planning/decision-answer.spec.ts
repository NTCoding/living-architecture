import { describe, expect, it } from 'vitest'
import { DecisionAnswer, InvalidDecisionAnswer } from './decision-answer'

const time = '2026-11-27T09:41:00Z'

describe('DecisionAnswer', () => {
  it('records the option you picked', () => {
    const answer = DecisionAnswer.from({
      choice: 'proposal',
      chosen: 'Write one merged graph file per workspace.',
      reply: null,
      time,
    })

    expect(answer.choice()).toBe('proposal')
    expect(answer.chosen()).toBe('Write one merged graph file per workspace.')
    expect(answer.reply()).toBeNull()
    expect(answer.time()).toBe(time)
  })

  it('records your own words when you wrote them', () => {
    const answer = DecisionAnswer.from({
      choice: 'reply',
      chosen: 'Neither option works.',
      reply: 'Write one file per repository and merge on read.',
      time,
    })

    expect(answer.choice()).toBe('reply')
    expect(answer.reply()).toBe('Write one file per repository and merge on read.')
  })

  it('rejects a choice that is not one of the 3', () => {
    expect(() => DecisionAnswer.from({ choice: 'maybe', chosen: 'x', reply: null, time })).toThrow(
      InvalidDecisionAnswer,
    )
  })

  it('rejects an answer with no chosen text', () => {
    expect(() =>
      DecisionAnswer.from({ choice: 'proposal', chosen: '  ', reply: null, time }),
    ).toThrow('records the text that was chosen')
  })

  it('rejects an answer with no time', () => {
    expect(() =>
      DecisionAnswer.from({ choice: 'proposal', chosen: 'x', reply: null, time: '' }),
    ).toThrow('records when it was given')
  })

  it('rejects your own words when you picked an option', () => {
    expect(() =>
      DecisionAnswer.from({ choice: 'proposal', chosen: 'x', reply: 'my own words', time }),
    ).toThrow('only when you chose to write them')
  })

  it('rejects a reply choice with no words', () => {
    expect(() => DecisionAnswer.from({ choice: 'reply', chosen: 'x', reply: null, time })).toThrow(
      'only when you chose to write them',
    )
    expect(() => DecisionAnswer.from({ choice: 'reply', chosen: 'x', reply: '  ', time })).toThrow(
      'only when you chose to write them',
    )
  })
})
