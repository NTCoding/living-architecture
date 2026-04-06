import {
  applyEvent, EMPTY_STATE 
} from './fold'
import type { WorkflowEvent } from './workflow-events'
import type { WorkflowState } from './workflow-types'

const AT = '2026-01-01T00:00:00Z'

function makeState(overrides: Partial<WorkflowState>): WorkflowState {
  return {
    ...EMPTY_STATE,
    ...overrides,
  }
}

describe('EMPTY_STATE', () => {
  it('has IMPLEMENTING state with all flags false', () => {
    expect(EMPTY_STATE).toMatchObject({
      currentStateMachineState: 'IMPLEMENTING',
      architectureReviewPassed: false,
      codeReviewPassed: false,
      bugScannerPassed: false,
      ciPassed: false,
      feedbackClean: false,
      feedbackAddressed: false,
      taskCheckPassed: false,
    })
  })

  it('has no preBlockedState', () => {
    expect(EMPTY_STATE.preBlockedState).toBeUndefined()
  })
})

describe('applyEvent — session-started', () => {
  it('returns state unchanged', () => {
    const event: WorkflowEvent = {
      type: 'session-started',
      at: AT,
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result).toStrictEqual(EMPTY_STATE)
  })
})

describe('applyEvent — issue-recorded', () => {
  it('sets githubIssue', () => {
    const event: WorkflowEvent = {
      type: 'issue-recorded',
      at: AT,
      issueNumber: 42,
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.githubIssue).toStrictEqual(42)
  })
})

describe('applyEvent — branch-recorded', () => {
  it('sets featureBranch', () => {
    const event: WorkflowEvent = {
      type: 'branch-recorded',
      at: AT,
      branch: 'feature/x',
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.featureBranch).toStrictEqual('feature/x')
  })
})

describe('applyEvent — architecture-review-completed', () => {
  it('sets architectureReviewPassed to true when passed', () => {
    const event: WorkflowEvent = {
      type: 'architecture-review-completed',
      at: AT,
      passed: true,
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.architectureReviewPassed).toStrictEqual(true)
  })

  it('sets architectureReviewPassed to false when failed', () => {
    const state = makeState({ architectureReviewPassed: true })
    const event: WorkflowEvent = {
      type: 'architecture-review-completed',
      at: AT,
      passed: false,
    }
    const result = applyEvent(state, event)
    expect(result.architectureReviewPassed).toStrictEqual(false)
  })
})

describe('applyEvent — code-review-completed', () => {
  it('sets codeReviewPassed to true when passed', () => {
    const event: WorkflowEvent = {
      type: 'code-review-completed',
      at: AT,
      passed: true,
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.codeReviewPassed).toStrictEqual(true)
  })

  it('sets codeReviewPassed to false when failed', () => {
    const state = makeState({ codeReviewPassed: true })
    const event: WorkflowEvent = {
      type: 'code-review-completed',
      at: AT,
      passed: false,
    }
    const result = applyEvent(state, event)
    expect(result.codeReviewPassed).toStrictEqual(false)
  })
})

describe('applyEvent — bug-scanner-completed', () => {
  it('sets bugScannerPassed to true when passed', () => {
    const event: WorkflowEvent = {
      type: 'bug-scanner-completed',
      at: AT,
      passed: true,
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.bugScannerPassed).toStrictEqual(true)
  })

  it('sets bugScannerPassed to false when failed', () => {
    const state = makeState({ bugScannerPassed: true })
    const event: WorkflowEvent = {
      type: 'bug-scanner-completed',
      at: AT,
      passed: false,
    }
    const result = applyEvent(state, event)
    expect(result.bugScannerPassed).toStrictEqual(false)
  })
})

describe('applyEvent — pr-recorded', () => {
  it('sets prNumber', () => {
    const event: WorkflowEvent = {
      type: 'pr-recorded',
      at: AT,
      prNumber: 7,
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.prNumber).toStrictEqual(7)
  })

  it('sets prUrl when provided', () => {
    const event: WorkflowEvent = {
      type: 'pr-recorded',
      at: AT,
      prNumber: 7,
      prUrl: 'https://github.com/x/y/pull/7',
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.prUrl).toStrictEqual('https://github.com/x/y/pull/7')
  })
})

describe('applyEvent — ci-completed', () => {
  it('sets ciPassed to true when passed', () => {
    const event: WorkflowEvent = {
      type: 'ci-completed',
      at: AT,
      passed: true,
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.ciPassed).toStrictEqual(true)
  })

  it('sets ciPassed to false when failed', () => {
    const state = makeState({ ciPassed: true })
    const event: WorkflowEvent = {
      type: 'ci-completed',
      at: AT,
      passed: false,
      output: 'test failures',
    }
    const result = applyEvent(state, event)
    expect(result.ciPassed).toStrictEqual(false)
  })
})

describe('applyEvent — feedback-checked', () => {
  it('sets feedbackClean to true when clean', () => {
    const event: WorkflowEvent = {
      type: 'feedback-checked',
      at: AT,
      clean: true,
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.feedbackClean).toStrictEqual(true)
  })

  it('sets feedbackClean to false and stores unresolvedCount when not clean', () => {
    const state = makeState({ feedbackClean: true })
    const event: WorkflowEvent = {
      type: 'feedback-checked',
      at: AT,
      clean: false,
      unresolvedCount: 3,
    }
    const result = applyEvent(state, event)
    expect(result.feedbackClean).toStrictEqual(false)
    expect(result.feedbackUnresolvedCount).toStrictEqual(3)
  })
})

describe('applyEvent — feedback-addressed', () => {
  it('sets feedbackAddressed to true and stores addressedCount', () => {
    const event: WorkflowEvent = {
      type: 'feedback-addressed',
      at: AT,
      addressedCount: 3,
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.feedbackAddressed).toStrictEqual(true)
    expect(result.feedbackAddressedCount).toStrictEqual(3)
  })
})

describe('applyEvent — task-check-passed', () => {
  it('sets taskCheckPassed to true', () => {
    const event: WorkflowEvent = {
      type: 'task-check-passed',
      at: AT,
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.taskCheckPassed).toStrictEqual(true)
  })
})

describe('applyEvent — reflection-written', () => {
  it('sets reflectionPath', () => {
    const event: WorkflowEvent = {
      type: 'reflection-written',
      at: AT,
      path: '/test-output/r.md',
    }
    const result = applyEvent(EMPTY_STATE, event)
    expect(result.reflectionPath).toStrictEqual('/test-output/r.md')
  })
})

describe('applyEvent — transitioned', () => {
  it('changes state field', () => {
    const result = applyEvent(EMPTY_STATE, {
      type: 'transitioned',
      at: AT,
      from: 'IMPLEMENTING',
      to: 'REVIEWING',
    })
    expect(result.currentStateMachineState).toStrictEqual('REVIEWING')
  })

  it('sets preBlockedState when transitioning to BLOCKED', () => {
    const result = applyEvent(EMPTY_STATE, {
      type: 'transitioned',
      at: AT,
      from: 'IMPLEMENTING',
      to: 'BLOCKED',
    })
    expect(result.preBlockedState).toStrictEqual('IMPLEMENTING')
    expect(result.currentStateMachineState).toStrictEqual('BLOCKED')
  })

  it('clears preBlockedState when transitioning away from BLOCKED', () => {
    const state = makeState({
      currentStateMachineState: 'BLOCKED',
      preBlockedState: 'IMPLEMENTING',
    })
    const result = applyEvent(state, {
      type: 'transitioned',
      at: AT,
      from: 'BLOCKED',
      to: 'IMPLEMENTING',
    })
    expect(result.preBlockedState).toBeUndefined()
    expect(result.currentStateMachineState).toStrictEqual('IMPLEMENTING')
  })

  it('applies stateOverrides from transition event', () => {
    const state = makeState({
      architectureReviewPassed: true,
      codeReviewPassed: true,
      bugScannerPassed: true,
      ciPassed: true,
      feedbackClean: true,
      feedbackAddressed: true,
    })
    const result = applyEvent(state, {
      type: 'transitioned',
      at: AT,
      from: 'REVIEWING',
      to: 'IMPLEMENTING',
      stateOverrides: {
        architectureReviewPassed: false,
        codeReviewPassed: false,
        bugScannerPassed: false,
        ciPassed: false,
        feedbackClean: false,
        feedbackAddressed: false,
      },
    })
    expect(result).toMatchObject({
      currentStateMachineState: 'IMPLEMENTING',
      architectureReviewPassed: false,
      codeReviewPassed: false,
      bugScannerPassed: false,
      ciPassed: false,
      feedbackClean: false,
      feedbackAddressed: false,
    })
  })

  it('is backward-compatible when stateOverrides is absent', () => {
    const result = applyEvent(EMPTY_STATE, {
      type: 'transitioned',
      at: AT,
      from: 'IMPLEMENTING',
      to: 'REVIEWING',
    })
    expect(result.currentStateMachineState).toStrictEqual('REVIEWING')
    expect(result.architectureReviewPassed).toStrictEqual(false)
  })

  it('applies ADDRESSING_FEEDBACK stateOverrides resets', () => {
    const state = makeState({
      currentStateMachineState: 'CHECKING_FEEDBACK',
      feedbackAddressed: true,
      feedbackClean: true,
      feedbackAddressedCount: 5,
    })
    const result = applyEvent(state, {
      type: 'transitioned',
      at: AT,
      from: 'CHECKING_FEEDBACK',
      to: 'ADDRESSING_FEEDBACK',
      stateOverrides: {
        feedbackAddressed: false,
        feedbackClean: false,
        feedbackAddressedCount: undefined,
      },
    })
    expect(result.currentStateMachineState).toStrictEqual('ADDRESSING_FEEDBACK')
    expect(result.feedbackAddressed).toStrictEqual(false)
    expect(result.feedbackClean).toStrictEqual(false)
    expect(result.feedbackAddressedCount).toBeUndefined()
  })

  it('currentStateMachineState in stateOverrides does not override fold logic', () => {
    const result = applyEvent(EMPTY_STATE, {
      type: 'transitioned',
      at: AT,
      from: 'IMPLEMENTING',
      to: 'REVIEWING',
      stateOverrides: { currentStateMachineState: 'COMPLETE' },
    })
    expect(result.currentStateMachineState).toStrictEqual('REVIEWING')
  })
})

describe('applyEvent — observation events return unchanged state', () => {
  it('bash-checked returns state unchanged', () => {
    const result = applyEvent(EMPTY_STATE, {
      type: 'bash-checked',
      at: AT,
      tool: 'Bash',
      command: 'ls',
      allowed: true,
    })
    expect(result).toStrictEqual(EMPTY_STATE)
  })

  it('write-checked returns state unchanged', () => {
    const result = applyEvent(EMPTY_STATE, {
      type: 'write-checked',
      at: AT,
      tool: 'Write',
      filePath: '/f',
      allowed: true,
    })
    expect(result).toStrictEqual(EMPTY_STATE)
  })
})
