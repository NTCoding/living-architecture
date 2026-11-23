import { describe, expect, it } from 'vitest'
import { ImplementationPlan } from './implementation-plan'

describe('ImplementationPlan', () => {
  it('renders one numbered section per item with a header and the detail below', () => {
    const plan = ImplementationPlan.from([
      { name: 'Add the value object', description: 'Create PlanItem in the domain model.' },
      { name: 'Wire the workflow', description: 'Store the rendered markdown in the run state.' },
    ])

    expect(plan.markdown()).toBe(
      [
        '### 1. Add the value object',
        '',
        'Create PlanItem in the domain model.',
        '',
        '### 2. Wire the workflow',
        '',
        'Store the rendered markdown in the run state.',
      ].join('\n'),
    )
  })

  it('trims the name and description of an item', () => {
    const plan = ImplementationPlan.from([
      { name: '  Add the value object  ', description: '  Create PlanItem.  ' },
    ])

    expect(plan.markdown()).toBe('### 1. Add the value object\n\nCreate PlanItem.')
  })

  it('rejects an empty plan', () => {
    expect(() => ImplementationPlan.from([])).toThrow('Array must contain at least 1 element(s)')
  })

  it('rejects an item with an empty name', () => {
    expect(() =>
      ImplementationPlan.from([{ name: '  ', description: 'Create PlanItem.' }]),
    ).toThrow('String must contain at least 1 character(s)')
  })

  it('rejects an item with an empty description', () => {
    expect(() =>
      ImplementationPlan.from([{ name: 'Add the value object', description: '' }]),
    ).toThrow('String must contain at least 1 character(s)')
  })
})
