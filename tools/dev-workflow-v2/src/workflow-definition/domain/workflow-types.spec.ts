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
      verifyPassed: false,
      reviewPassed: false,
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
      verifyPassed: true,
      reviewPassed: true,
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
    }
    const parsed = workflowStateSchema.parse(raw)
    expect(parsed.githubIssue).toStrictEqual(42)
    expect(parsed.prNumber).toStrictEqual(7)
    expect(parsed.preBlockedState).toStrictEqual('IMPLEMENTING')
  })

  it('rejects invalid state name', () => {
    const raw = {
      currentStateMachineState: 'INVALID',
      verifyPassed: false,
      reviewPassed: false,
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
      verifyPassed: false,
      reviewPassed: false,
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
      verifyPassed: false,
      reviewPassed: false,
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
