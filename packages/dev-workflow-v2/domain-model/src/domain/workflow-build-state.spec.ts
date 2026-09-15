import { describe, expect, it } from 'vitest'
import { MaintainerWorkflow } from './workflow'
import { getInitialWorkflowState } from './workflow-types'
import { makeDeps, TEST_WORKFLOW_REGISTRY } from './__fixtures__/workflow-test-fixtures'

describe('MaintainerWorkflow.build', () => {
  it('reads the initial state from its dependencies when no state is supplied', () => {
    const workflow = MaintainerWorkflow.build(TEST_WORKFLOW_REGISTRY, makeDeps())

    expect(workflow.getState().toJSON()).toStrictEqual(getInitialWorkflowState().toJSON())
  })

  it('builds from the supplied state instead of the dependency initial state', () => {
    const supplied = getInitialWorkflowState().with({
      currentStateMachineState: 'BLOCKED',
      githubIssue: 42,
    })

    const workflow = MaintainerWorkflow.build(TEST_WORKFLOW_REGISTRY, makeDeps(), supplied)

    expect(workflow.getState().toJSON().githubIssue).toBe(42)
    expect(workflow.getState().toJSON().currentStateMachineState).toBe('BLOCKED')
  })
})
