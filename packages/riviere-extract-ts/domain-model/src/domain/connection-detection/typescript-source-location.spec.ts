import { describe, expect, it } from 'vitest'
import { EnrichedComponent } from '../value-extraction/enriched-component'
import { CallSite } from './call-graph/call-graph-types'
import { TypeScriptSourceLocation } from './typescript-source-location'

describe('TypeScriptSourceLocation', () => {
  it('locates an enriched component within its repository', () => {
    const component = EnrichedComponent.parse({
      type: 'eventHandler',
      name: 'OrderPlacedHandler',
      location: { file: '/src/order-placed-handler.ts', line: 12 },
      domain: 'orders',
      module: 'orders',
      metadata: {},
      _missing: undefined,
    })

    const location = TypeScriptSourceLocation.parseFromComponent('shop', component)

    expect(location.toPublishedSourceLocation()).toStrictEqual({
      repository: 'shop',
      filePath: '/src/order-placed-handler.ts',
      lineNumber: 12,
    })
  })

  it('locates a call site and preserves its method', () => {
    const callSite = CallSite.parse({
      filePath: '/src/place-order.ts',
      lineNumber: 24,
      methodName: 'execute',
    })

    const location = TypeScriptSourceLocation.parseFromCallSite('shop', callSite)

    expect(location.toPublishedSourceLocation()).toStrictEqual({
      repository: 'shop',
      filePath: '/src/place-order.ts',
      lineNumber: 24,
      methodName: 'execute',
    })
  })
})
