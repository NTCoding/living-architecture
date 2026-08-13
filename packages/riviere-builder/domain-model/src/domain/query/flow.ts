import type { Component } from '@living-architecture/riviere-schema/schema'
import { FlowStep } from './flow-step'

/** @riviere-role value-object */
export class Flow {
  declare private readonly brand: 'Flow'
  readonly entryPoint: Component
  readonly steps: FlowStep[]

  private constructor(input: { readonly entryPoint: Component; readonly steps: FlowStep[] }) {
    this.entryPoint = input.entryPoint
    this.steps = input.steps
  }

  static parse(input: { readonly entryPoint: Component; readonly steps: FlowStep[] }): Flow {
    return new Flow(input)
  }
}
