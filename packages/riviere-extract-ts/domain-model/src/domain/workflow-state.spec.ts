import { describe, expect, it } from 'vitest'
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
})
