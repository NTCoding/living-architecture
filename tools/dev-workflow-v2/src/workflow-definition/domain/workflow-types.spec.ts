import {
  createWorkflowStateSchema, STATE_NAME_SCHEMA, STATE_NAMES 
} from './workflow-types'

const workflowStateSchema = createWorkflowStateSchema(STATE_NAMES)

describe('STATE_NAME_SCHEMA', () => {
  it('accepts all valid state names', () => {
    STATE_NAMES.forEach((s) => expect(STATE_NAME_SCHEMA.parse(s)).toStrictEqual(s))
  })

  it('rejects unknown state names', () => {
    expect(() => STATE_NAME_SCHEMA.parse('UNKNOWN')).toThrow('Invalid enum value')
  })

  it('rejects non-string values', () => {
    expect(() => STATE_NAME_SCHEMA.parse(42)).toThrow('received number')
  })
})

describe('createWorkflowStateSchema — WorkflowState', () => {
  it('parses valid minimal state', () => {
    const raw = {
      currentStateMachineState: 'IMPLEMENTING',
      architectureReviewPassed: false,
      codeReviewPassed: false,
      bugScannerPassed: false,
      taskCheckPassed: false,
      ciPassed: false,
      feedbackClean: false,
      feedbackAddressed: false,
    }
    const parsed = workflowStateSchema.parse(raw)
    expect(parsed.currentStateMachineState).toStrictEqual('IMPLEMENTING')
  })

  it('parses state with all optional fields', () => {
    const raw = {
      currentStateMachineState: 'SUBMITTING_PR',
      architectureReviewPassed: true,
      codeReviewPassed: true,
      bugScannerPassed: true,
      taskCheckPassed: false,
      ciPassed: false,
      feedbackClean: false,
      feedbackAddressed: false,
      githubIssue: 42,
      featureBranch: 'issue-42',
      prNumber: 7,
      prUrl: 'https://github.com/owner/repo/pull/7',
      reflectionPath: '/test-output/reflection.md',
      preBlockedState: 'IMPLEMENTING',
      feedbackUnresolvedCount: 3,
      feedbackAddressedCount: 3,
    }
    const parsed = workflowStateSchema.parse(raw)
    expect(parsed.githubIssue).toStrictEqual(42)
    expect(parsed.prNumber).toStrictEqual(7)
    expect(parsed.preBlockedState).toStrictEqual('IMPLEMENTING')
    expect(parsed.feedbackUnresolvedCount).toStrictEqual(3)
  })

  it('rejects invalid state name', () => {
    const raw = {
      currentStateMachineState: 'INVALID',
      architectureReviewPassed: false,
      codeReviewPassed: false,
      bugScannerPassed: false,
      taskCheckPassed: false,
      ciPassed: false,
      feedbackClean: false,
      feedbackAddressed: false,
    }
    expect(() => workflowStateSchema.parse(raw)).toThrow('Invalid enum value')
  })

  it('rejects negative githubIssue', () => {
    const raw = {
      currentStateMachineState: 'IMPLEMENTING',
      architectureReviewPassed: false,
      codeReviewPassed: false,
      bugScannerPassed: false,
      taskCheckPassed: false,
      ciPassed: false,
      feedbackClean: false,
      feedbackAddressed: false,
      githubIssue: -1,
    }
    expect(() => workflowStateSchema.parse(raw)).toThrow('greater than 0')
  })

  it('accepts optional preBlockedState', () => {
    const raw = {
      currentStateMachineState: 'BLOCKED',
      architectureReviewPassed: false,
      codeReviewPassed: false,
      bugScannerPassed: false,
      taskCheckPassed: false,
      ciPassed: false,
      feedbackClean: false,
      feedbackAddressed: false,
      preBlockedState: 'IMPLEMENTING',
    }
    const parsed = workflowStateSchema.parse(raw)
    expect(parsed.preBlockedState).toStrictEqual('IMPLEMENTING')
  })
})
