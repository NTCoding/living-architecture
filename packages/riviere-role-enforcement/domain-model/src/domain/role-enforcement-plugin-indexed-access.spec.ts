import { expect, it } from 'vitest'
import { enforce } from './__fixtures__/role-enforcement-plugin-fixture'

it('rejects an indexed access type into a value object', () => {
  const messages = enforce(`/** @riviere-role value-object */
export class WorkflowState {
  declare private readonly brand: 'WorkflowState'

  private constructor(readonly currentStateMachineState: string) {}

  static parse(value: string): WorkflowState {
    return new WorkflowState(value)
  }
}

type StateName = WorkflowState['currentStateMachineState']
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("Role 'value-object' forbids indexed access types")
})

it('rejects a ReturnType derived from a value object method', () => {
  const messages = enforce(`/** @riviere-role value-object */
export class WorkflowState {
  declare private readonly brand: 'WorkflowState'

  private constructor(readonly currentStateMachineState: string) {}

  static parse(value: string): WorkflowState {
    return new WorkflowState(value)
  }

  currentStateName(): string {
    return this.currentStateMachineState
  }
}

type StateName = ReturnType<WorkflowState['currentStateName']>
`)

  expect(messages).toHaveLength(1)
  expect(messages[0]?.message).toContain("Role 'value-object' forbids indexed access types")
})
