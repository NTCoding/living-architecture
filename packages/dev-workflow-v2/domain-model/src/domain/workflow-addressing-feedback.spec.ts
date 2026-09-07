import { describe, expect, it } from 'vitest'
import { spec, eventsToAddressingFeedback } from './__fixtures__/workflow-test-fixtures'
import { AddressingFeedbackState } from './states/addressing-feedback'

const addressingFeedbackState = AddressingFeedbackState.parse('ADDRESSING_FEEDBACK')

describe('ADDRESSING_FEEDBACK workflow behavior', () => {
  it('resets feedback flags on entry so the review gate re-evidences the PR', () => {
    const { state } = spec.given(...eventsToAddressingFeedback()).when((wf) => wf.getState())

    expect(state).toMatchObject({
      feedbackAddressed: false,
      feedbackClean: false,
    })
  })

  it('sends remediation back through verification for a follow-up review', () => {
    expect(addressingFeedbackState.canTransitionTo).toStrictEqual(['VERIFYING', 'BLOCKED'])
    expect(addressingFeedbackState.allowedWorkflowOperations).toStrictEqual([])
  })
})
