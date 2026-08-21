import { describe, expect, it } from 'vitest'
import { ExtractionStage } from './extraction-stage'
import { WorkflowStage, WorkflowState } from './workflow-state'

describe('WorkflowStage', () => {
  it('rejects an executable stage with no extraction state', () => {
    expect(() => WorkflowStage.parse({ kind: 'extract' })).toThrow(
      'Workflow extract stage requires extraction state',
    )
  })

  it('rejects access to extraction state on validation', () => {
    const stage = WorkflowStage.parse({ kind: 'validate' })

    expect(() => stage.stage).toThrow('Validate stage has no extraction state')
  })

  it('rejects extraction state on a validation stage', () => {
    const extractionStage = Object.create(ExtractionStage.prototype)
    expect(() => WorkflowStage.parse({ kind: 'validate', stage: extractionStage })).toThrow(
      'Validate stage cannot have extraction state',
    )
  })

  it('stores immutable workflow graph state', () => {
    const validate = WorkflowStage.parse({ kind: 'validate' })
    const state = WorkflowState.parse({
      graph: { domains: {}, outputPath: 'graph.json', sources: [{ repository: 'shop' }] },
      runLogDirectory: 'logs',
      stages: [validate],
    })

    expect(state).toMatchObject({
      graph: { outputPath: 'graph.json', sources: [{ repository: 'shop' }] },
      runLogDirectory: 'logs',
      stages: [validate],
    })
  })

  it('copies and freezes workflow state containers', () => {
    const validate = WorkflowStage.parse({ kind: 'validate' })
    const graph = {
      domains: { orders: { description: 'Orders', systemType: 'domain' as const } },
      outputPath: 'graph.json',
      sources: [{ repository: 'shop' }],
    }
    const stages = [validate]
    const state = WorkflowState.parse({ graph, runLogDirectory: 'logs', stages })

    graph.domains.orders.description = 'Changed'
    graph.sources[0]!.repository = 'changed'
    stages.push(validate)

    expect(state.graph.domains['orders']!.description).toBe('Orders')
    expect(state.graph.sources).toStrictEqual([{ repository: 'shop' }])
    expect(state.stages).toHaveLength(1)
  })

  it('freezes workflow state containers', () => {
    const validate = WorkflowStage.parse({ kind: 'validate' })
    const state = WorkflowState.parse({
      graph: {
        domains: { orders: { description: 'Orders', systemType: 'domain' } },
        outputPath: 'graph.json',
        sources: [{ repository: 'shop' }],
      },
      runLogDirectory: 'logs',
      stages: [validate],
    })

    expect(Object.isFrozen(state.graph)).toBe(true)
    expect(Object.isFrozen(state.graph.domains)).toBe(true)
    expect(Object.isFrozen(state.graph.sources)).toBe(true)
    expect(Object.isFrozen(state.stages)).toBe(true)
  })
})
