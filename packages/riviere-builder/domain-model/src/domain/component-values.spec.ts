import { BusinessRules } from './business-rules'
import { DomainOperationBehavior } from './domain-operation-behavior'
import { ExistingValuePreference } from './existing-value-preference'
import { StateTransitions } from './state-transitions'
import { SubscribedEvents } from './subscribed-events'

describe('component update values', () => {
  it('preserves an existing value when configured', () => {
    const preference = ExistingValuePreference.parse(true)
    expect(preference.valueAfterUpdate('existing', 'incoming')).toBe('existing')
  })

  it('accepts an incoming value by default', () => {
    const preference = ExistingValuePreference.parse(undefined)
    expect(preference.valueAfterUpdate('existing', 'incoming')).toBe('incoming')
  })

  it('treats missing incoming values as no update', () => {
    const preference = ExistingValuePreference.parse(false)
    expect(preference.valueAfterUpdate('existing', undefined)).toBe('existing')
    expect(preference.valueAfterUpdate('existing', null)).toBe('existing')
  })

  it('keeps unique business rules in encounter order', () => {
    const rules = BusinessRules.parse(['A', 'A']).including(['B', 'A', 'B'])
    expect(rules.values).toStrictEqual(['A', 'B'])
  })

  it('keeps unique state transitions in encounter order', () => {
    const draftToPlaced = { from: 'draft', to: 'placed' }
    const placedToPaid = { from: 'placed', to: 'paid' }
    const transitions = StateTransitions.parse([draftToPlaced, draftToPlaced]).including([
      placedToPaid,
      draftToPlaced,
      placedToPaid,
    ])
    expect(transitions.values).toStrictEqual([draftToPlaced, placedToPaid])
  })

  it('treats transitions with different triggers as unique', () => {
    const transitions = StateTransitions.parse([
      { from: 'draft', to: 'placed' },
      { from: 'draft', to: 'placed', trigger: 'submit' },
    ])
    expect(transitions.values).toHaveLength(2)
  })

  it('keeps unique operation behaviour values', () => {
    const behavior = DomainOperationBehavior.parse({ reads: ['order', 'order'] }).including({
      reads: ['customer', 'order', 'customer'],
      emits: ['OrderPlaced', 'OrderPlaced'],
    })
    expect(behavior.value).toStrictEqual({
      reads: ['order', 'customer'],
      emits: ['OrderPlaced'],
    })
  })

  it('keeps operation behaviour when no update is supplied', () => {
    const behavior = DomainOperationBehavior.parse({ reads: ['order'] })
    expect(behavior.including(undefined)).toBe(behavior)
  })

  it('keeps unique subscribed events', () => {
    const events = SubscribedEvents.parseValues(['OrderCreated', 'OrderCreated']).including([
      'OrderCancelled',
      'OrderCreated',
      'OrderCancelled',
    ])
    expect(events.values).toStrictEqual(['OrderCreated', 'OrderCancelled'])
  })

  it('accepts absent subscribed events and keeps an unchanged collection', () => {
    expect(SubscribedEvents.parseValues(undefined).values).toStrictEqual([])
    const events = SubscribedEvents.parseValues(['OrderCreated'])
    expect(events.including(['OrderCreated'])).toBe(events)
  })
})
