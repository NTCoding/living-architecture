import { describe, expect, it } from 'vitest'
import { WorkflowDiagnostic } from './workflow-diagnostic'

describe('WorkflowDiagnostic', () => {
  it('detaches source locations from later input changes', () => {
    const sourceLocation = { repository: 'shop', filePath: 'orders.ts' }
    const diagnostic = WorkflowDiagnostic.fromUncertainLink({
      source: 'place-order',
      target: 'create-order',
      sourceLocation,
    })

    sourceLocation.filePath = 'changed.ts'

    expect(diagnostic.value).toStrictEqual({
      kind: 'uncertain-link',
      source: 'place-order',
      target: 'create-order',
      sourceLocation: { repository: 'shop', filePath: 'orders.ts' },
    })
  })

  it('describes a missing field diagnostic', () => {
    expect(
      WorkflowDiagnostic.fromMissingField('orders:checkout:usecase:place-order', 'name').describe(),
    ).toBe("missing field 'name' on component 'orders:checkout:usecase:place-order'")
  })

  it('describes an uncertain link diagnostic', () => {
    expect(
      WorkflowDiagnostic.fromUncertainLink({
        source: 'place-order',
        target: 'create-order',
      }).describe(),
    ).toBe("uncertain link from 'place-order' to 'create-order'")
  })

  it('describes an unmapped record diagnostic', () => {
    expect(WorkflowDiagnostic.fromUnmappedRecord('service', 'OrdersService').describe()).toBe(
      "unmapped service 'OrdersService'",
    )
  })

  it('derives a stable identity per diagnostic kind', () => {
    expect([
      WorkflowDiagnostic.fromMissingField('orders:checkout:usecase:place-order', 'name').identity(),
      WorkflowDiagnostic.fromUncertainLink({
        source: 'place-order',
        target: 'create-order',
      }).identity(),
      WorkflowDiagnostic.fromUnmappedRecord('event', 'OrderCreated').identity(),
    ]).toStrictEqual([
      'missing-field:orders:checkout:usecase:place-order:name',
      'uncertain-link:place-order:create-order',
      'unmapped-record:event:OrderCreated',
    ])
  })
})
