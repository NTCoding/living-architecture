import { describe, expect, it } from 'vitest'
import { PlanApproval } from './plan-approval'

describe('PlanApproval', () => {
  it('records an approval with notes', () => {
    const approval = PlanApproval.from({ approved: true, notes: 'Start with the value objects.' })

    expect(approval.isApproved()).toBe(true)
    expect(approval.notes()).toBe('Start with the value objects.')
  })

  it('records a rejection without notes', () => {
    const approval = PlanApproval.from({ approved: false, notes: null })

    expect(approval.isApproved()).toBe(false)
    expect(approval.notes()).toBeNull()
  })

  it('rejects a decision that is not a boolean', () => {
    const decision = JSON.parse('{"approved":"yes","notes":null}')

    expect(() => PlanApproval.from(decision)).toThrow('Expected boolean, received string')
  })
})
