import { describe, expect, it } from 'vitest'
import { Idea, InvalidIdea } from './idea'

const fields = {
  title: 'Preset workflows',
  status: 'captured',
  need: 'definitely-needed',
  epic: null,
}

describe('Idea', () => {
  it('keeps the 4 fields the board needs', () => {
    const idea = Idea.from(fields)

    expect(idea.toFields()).toStrictEqual(fields)
  })

  it('reads each field back', () => {
    const idea = Idea.from(fields)

    expect([idea.title(), idea.status(), idea.need(), idea.epic()]).toStrictEqual([
      'Preset workflows',
      'captured',
      'definitely-needed',
      null,
    ])
  })

  it('trims the title', () => {
    expect(Idea.from({ ...fields, title: '  Preset workflows  ' }).title()).toBe('Preset workflows')
  })

  it('starts planning as exploring, with the epic it became', () => {
    const idea = Idea.from(fields).startPlanning('cross-repo-linking')

    expect(idea.status()).toBe('exploring')
    expect(idea.epic()).toBe('cross-repo-linking')
  })

  it('finishes planning as planned', () => {
    const idea = Idea.from(fields).startPlanning('cross-repo-linking').planned()

    expect(idea.status()).toBe('planned')
  })

  it('refuses to start planning an idea that is not captured', () => {
    expect(() => Idea.from(fields).startPlanning('x').startPlanning('y')).toThrow(
      'Only a captured idea can start planning',
    )
  })

  it('refuses an epic with no slug', () => {
    expect(() => Idea.from(fields).startPlanning('  ')).toThrow('needs a slug')
  })

  it('refuses to finish planning an idea that has no epic', () => {
    expect(() => Idea.from(fields).planned()).toThrow('has no epic')
  })

  it('rejects an idea with no title', () => {
    expect(() => Idea.from({ ...fields, title: ' ' })).toThrow('has a title')
  })

  it('rejects a status the ideas do not have', () => {
    expect(() => Idea.from({ ...fields, status: 'done' })).toThrow('idea status is one of')
  })

  it('rejects a need level the ideas do not have', () => {
    expect(() => Idea.from({ ...fields, need: 'needed' })).toThrow('need level is one of')
  })

  it('says why an idea cannot be planned twice', () => {
    expect(new InvalidIdea('An idea has a title.').message).toBe('An idea has a title.')
  })
})
