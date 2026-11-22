import { describe, expect, it } from 'vitest'
import { NotAnEarlierStep, PlanningStep, UnknownPlanningStep } from './planning-step'

describe('PlanningStep', () => {
  it('reads a step from its name', () => {
    expect(PlanningStep.from('architecture').name()).toBe('architecture')
  })

  it('rejects a name that is not a step', () => {
    expect(() => PlanningStep.from('retro')).toThrow(UnknownPlanningStep)
  })

  it('moves to the next step', () => {
    expect(PlanningStep.from('prd').next()?.name()).toBe('architecture')
  })

  it('has no next step after the last one', () => {
    expect(PlanningStep.from('delivery-planning').next()).toBeNull()
  })

  it('knows which step comes earlier', () => {
    expect(PlanningStep.from('prd').isBefore(PlanningStep.from('dogfooding'))).toBe(true)
    expect(PlanningStep.from('prd').isBefore(PlanningStep.from('prd'))).toBe(false)
    expect(PlanningStep.from('architecture').isBefore(PlanningStep.from('prd'))).toBe(false)
  })

  it('compares 2 steps for equality', () => {
    expect(PlanningStep.from('prd').equals(PlanningStep.from('prd'))).toBe(true)
    expect(PlanningStep.from('prd').equals(PlanningStep.from('architecture'))).toBe(false)
  })

  it('says why an epic cannot go back to a step that is not earlier', () => {
    expect(() =>
      PlanningStep.from('problem-definition').isBefore(PlanningStep.from('prd')),
    ).not.toThrow()
    expect(new NotAnEarlierStep('prd', 'architecture').message).toContain('is not an earlier step')
  })
})
