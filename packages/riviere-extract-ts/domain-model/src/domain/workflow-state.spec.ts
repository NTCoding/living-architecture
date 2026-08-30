import { RiviereBuilder } from '@living-architecture/riviere-builder-published-language'
import { describe, expect, it } from 'vitest'
import { WorkflowState } from './workflow-state'

function builder(): RiviereBuilder {
  return RiviereBuilder.new({
    name: 'Shop',
    description: 'Shop graph',
    sources: [{ repository: 'shop' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
  })
}

describe('WorkflowState', () => {
  it('creates a candidate builder without changing the supplied graph', () => {
    const currentBuilder = builder()
    currentBuilder.addUseCase({
      name: 'Existing graph',
      domain: 'orders',
      module: 'orders',
      sourceLocation: { repository: 'shop', filePath: 'existing.ts' },
    })

    const state = WorkflowState.fromBuilder(currentBuilder)
    state.builder().addUseCase({
      name: 'Workflow graph',
      domain: 'orders',
      module: 'orders',
      sourceLocation: { repository: 'shop', filePath: 'workflow.ts' },
    })

    expect(currentBuilder.build().components.map((item) => item.name)).toStrictEqual([
      'Existing graph',
    ])
    expect(
      state
        .builder()
        .build()
        .components.map((item) => item.name),
    ).toStrictEqual(['Workflow graph'])
  })
})
