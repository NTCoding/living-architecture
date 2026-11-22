import { describe, expect, it } from 'vitest'
import { Epic, InvalidEpic } from './epic'
import { NotAnEarlierStep, PlanningStep } from './planning-step'

const time = '2026-11-24T09:02:00Z'

function epicAt(step: string): Epic {
  return Epic.from({
    title: 'Cross-repo linking',
    idea: 'cross-repo-linking',
    stage: { kind: 'planning', step: PlanningStep.from(step) },
    features: [],
    history: [],
  })
}

const features = [
  { id: 'M1', title: 'The graph merges', stories: [901, 902] },
  { id: 'M2', title: 'The references resolve', stories: [903] },
]

describe('Epic', () => {
  it('keeps its title, idea and features', () => {
    const epic = Epic.from({
      title: '  Cross-repo linking  ',
      idea: 'cross-repo-linking',
      stage: { kind: 'planning', step: PlanningStep.from('prd') },
      features,
      history: [],
    })

    expect([epic.title(), epic.idea(), epic.stories()]).toStrictEqual([
      'Cross-repo linking',
      'cross-repo-linking',
      [901, 902, 903],
    ])
  })

  it('reads its features back', () => {
    const epic = Epic.from({
      title: 'Cross-repo linking',
      idea: null,
      stage: { kind: 'in-progress' },
      features,
      history: [],
    })

    expect(epic.features()).toStrictEqual(features)
  })

  it('moves to the next step when the step is approved', () => {
    const epic = epicAt('problem-definition').approve(
      PlanningStep.from('problem-definition'),
      0,
      time,
    )

    expect(epic.stage()).toStrictEqual({
      kind: 'planning',
      step: PlanningStep.from('solution-exploration'),
    })
    expect(epic.history()).toStrictEqual([
      { event: 'approved', step: 'problem-definition', time, reason: null },
    ])
  })

  it('starts creating the stories once delivery planning is approved', () => {
    const epic = epicAt('delivery-planning').approve(
      PlanningStep.from('delivery-planning'),
      0,
      time,
    )

    expect(epic.stage()).toStrictEqual({ kind: 'creating-stories' })
  })

  it('refuses to approve a step the epic is not on', () => {
    expect(() => epicAt('prd').approve(PlanningStep.from('architecture'), 0, time)).toThrow(
      'so architecture cannot be approved',
    )
  })

  it('refuses to approve a step while something waits for Nick', () => {
    expect(() => epicAt('prd').approve(PlanningStep.from('prd'), 2, time)).toThrow(
      '2 items on prd still wait for Nick',
    )
  })

  it('goes back to an earlier step and records why', () => {
    const epic = epicAt('architecture').sendBack(
      PlanningStep.from('prd'),
      '  The data model is wrong.  ',
      time,
    )

    expect(epic.stage()).toStrictEqual({ kind: 'planning', step: PlanningStep.from('prd') })
    expect(epic.history()).toStrictEqual([
      { event: 'sent-back', step: 'prd', time, reason: 'The data model is wrong.' },
    ])
  })

  it('refuses to send the epic back to the step it is on', () => {
    expect(() => epicAt('prd').sendBack(PlanningStep.from('prd'), 'why', time)).toThrow(
      NotAnEarlierStep,
    )
  })

  it('refuses to send the epic back without a reason', () => {
    expect(() => epicAt('architecture').sendBack(PlanningStep.from('prd'), '  ', time)).toThrow(
      'says why',
    )
  })

  it('refuses to approve or send back an epic that is not being planned', () => {
    const epic = Epic.from({
      title: 'Cross-repo linking',
      idea: null,
      stage: { kind: 'creating-stories' },
      features: [],
      history: [],
    })

    expect(() => epic.approve(PlanningStep.from('prd'), 0, time)).toThrow('not being planned')
    expect(() => epic.sendBack(PlanningStep.from('prd'), 'why', time)).toThrow('not being planned')
  })

  it('records the features and moves to in progress', () => {
    const epic = Epic.from({
      title: 'Cross-repo linking',
      idea: null,
      stage: { kind: 'creating-stories' },
      features: [],
      history: [],
    }).recordStories(features, time)

    expect(epic.stage()).toStrictEqual({ kind: 'in-progress' })
    expect(epic.stories()).toStrictEqual([901, 902, 903])
  })

  it('refuses to record the stories before delivery planning is approved', () => {
    expect(() => epicAt('prd').recordStories(features, time)).toThrow('cannot be recorded now')
  })

  it('finishes once every story is closed', () => {
    const epic = Epic.from({
      title: 'Cross-repo linking',
      idea: null,
      stage: { kind: 'in-progress' },
      features,
      history: [],
    }).finish([901, 902, 903], time)

    expect(epic.stage()).toStrictEqual({ kind: 'done' })
  })

  it('refuses to finish while a story is open', () => {
    const epic = Epic.from({
      title: 'Cross-repo linking',
      idea: null,
      stage: { kind: 'in-progress' },
      features,
      history: [],
    })

    expect(() => epic.finish([901], time)).toThrow('still has open stories: #902, #903')
  })

  it('refuses to finish an epic that has not started', () => {
    expect(() => epicAt('prd').finish([], time)).toThrow('cannot be finished')
  })

  it('rejects an epic with no title', () => {
    expect(() =>
      Epic.from({
        title: ' ',
        idea: null,
        stage: { kind: 'done' },
        features: [],
        history: [],
      }),
    ).toThrow('has a title')
  })

  it('says why an epic cannot be approved', () => {
    expect(new InvalidEpic('An epic has a title.').message).toBe('An epic has a title.')
  })
})
