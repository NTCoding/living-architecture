import { describe, expect, it, vi } from 'vitest'
import { getInitialWorkflowState } from '../workflow-types'
import { ReviewingState } from './reviewing'

function reviewingState(
  startReviewCycle: () => { readonly pass: boolean; readonly reason?: string },
) {
  return ReviewingState.parse('REVIEWING', {
    workflow: {
      getState: () =>
        getInitialWorkflowState().with({ currentStateMachineState: 'REVIEWING', prNumber: 9 }),
      startReviewCycle,
    },
  })
}

describe('Reviewing state', () => {
  it('requires entry dependencies before starting a review cycle', () => {
    expect(() => ReviewingState.parse('REVIEWING').afterEntry()).toThrow('dependencies')
  })

  it('starts a review cycle when reviewing is entered', () => {
    const startReviewCycle = vi.fn().mockReturnValue({ pass: true })

    reviewingState(startReviewCycle).afterEntry()

    expect(startReviewCycle).toHaveBeenCalledTimes(1)
  })

  it('fails entry when a review cycle cannot start', () => {
    const startReviewCycle = vi
      .fn()
      .mockReturnValue({ pass: false, reason: 'A review cycle is already open.' })

    expect(() => reviewingState(startReviewCycle).afterEntry()).toThrow(
      'A review cycle is already open.',
    )
  })

  it('fails entry with a default reason when none is supplied', () => {
    const startReviewCycle = vi.fn().mockReturnValue({ pass: false })

    expect(() => reviewingState(startReviewCycle).afterEntry()).toThrow(
      'Unable to start a review cycle.',
    )
  })
})
