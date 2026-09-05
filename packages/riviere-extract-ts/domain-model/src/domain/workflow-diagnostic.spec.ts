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
})
