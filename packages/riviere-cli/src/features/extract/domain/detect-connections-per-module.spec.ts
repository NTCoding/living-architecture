import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import type { Module } from '@living-architecture/riviere-extract-config'
import type {
  EnrichedComponent,
  ExtractedLink,
  PerModuleDetectionResult,
  CrossModuleDetectionResult,
} from '@living-architecture/riviere-extract-ts'
import type { ModuleContext } from './extract-draft-components'

const {
  mockDetectPerModule,
  mockDetectCrossModule,
  mockDeduplicateCrossStrategy,
  mockMatchesGlob,
} = vi.hoisted(() => ({
  mockDetectPerModule: vi.fn(),
  mockDetectCrossModule: vi.fn(),
  mockDeduplicateCrossStrategy: vi.fn((links: ExtractedLink[]) => links),
  mockMatchesGlob: vi.fn(),
}))

vi.mock('@living-architecture/riviere-extract-ts', () => ({
  detectPerModuleConnections: mockDetectPerModule,
  detectCrossModuleConnections: mockDetectCrossModule,
  deduplicateCrossStrategy: mockDeduplicateCrossStrategy,
  matchesGlob: mockMatchesGlob,
}))

import { detectConnectionsPerModule } from './detect-connections-per-module'

function createModule(name: string): Module {
  return {
    name,
    path: name,
    glob: 'src/**',
    api: { notUsed: true },
    useCase: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    eventPublisher: { notUsed: true },
    ui: { notUsed: true },
  }
}

function createModuleContext(moduleName: string): ModuleContext {
  return {
    module: createModule(moduleName),
    files: [],
    project: Object.create(null),
  }
}

function createComponent(
  name: string,
  domain: string,
  type: string,
  metadata: Record<string, unknown> = {},
): EnrichedComponent {
  return {
    name,
    domain,
    type,
    location: {
      file: `/src/${domain}/${name}.ts`,
      line: 1,
    },
    metadata,
  }
}

function createLink(source: string, target: string, type: 'sync' | 'async'): ExtractedLink {
  return {
    source,
    target,
    type,
  }
}

describe('detectConnectionsPerModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs per-module detection for each module with its own components', () => {
    const ordersCtx = createModuleContext('orders')
    const shippingCtx = createModuleContext('shipping')
    const orderComp = createComponent('PlaceOrder', 'orders', 'useCase')
    const shippingComp = createComponent('ShipOrder', 'shipping', 'useCase')

    const perModuleResult: PerModuleDetectionResult = {
      links: [],
      timings: {
        callGraphMs: 1,
        configurableMs: 0,
        setupMs: 0,
      },
    }
    mockDetectPerModule.mockReturnValue(perModuleResult)
    const crossResult: CrossModuleDetectionResult = {
      links: [],
      timings: { asyncDetectionMs: 0 },
    }
    mockDetectCrossModule.mockReturnValue(crossResult)

    detectConnectionsPerModule(
      [ordersCtx, shippingCtx],
      [orderComp, shippingComp],
      'test-repo',
      false,
    )

    expect(mockDetectPerModule).toHaveBeenCalledTimes(2)
    expect(mockDetectPerModule).toHaveBeenNthCalledWith(
      1,
      ordersCtx.project,
      [orderComp],
      expect.any(Object),
      mockMatchesGlob,
    )
    expect(mockDetectPerModule).toHaveBeenNthCalledWith(
      2,
      shippingCtx.project,
      [shippingComp],
      expect.any(Object),
      mockMatchesGlob,
    )
  })

  it('passes all components to cross-module detection', () => {
    const ordersCtx = createModuleContext('orders')
    const orderComp = createComponent('PlaceOrder', 'orders', 'useCase')
    const shippingComp = createComponent('ShipEvent', 'shipping', 'event', {eventName: 'ShipEvent',})

    mockDetectPerModule.mockReturnValue({
      links: [],
      timings: {
        callGraphMs: 0,
        configurableMs: 0,
        setupMs: 0,
      },
    })
    mockDetectCrossModule.mockReturnValue({
      links: [],
      timings: { asyncDetectionMs: 0 },
    })

    detectConnectionsPerModule([ordersCtx], [orderComp, shippingComp], 'test-repo', false)

    expect(mockDetectCrossModule).toHaveBeenCalledWith([orderComp, shippingComp], {
      allowIncomplete: false,
      repository: 'test-repo',
    })
  })

  it('combines links from per-module and cross-module phases', () => {
    const ordersCtx = createModuleContext('orders')
    const orderComp = createComponent('PlaceOrder', 'orders', 'useCase')

    const syncLink = createLink('orders:useCase:PlaceOrder', 'orders:repository:OrderRepo', 'sync')
    const asyncLink = createLink(
      'shipping:event:ShipmentDispatched',
      'orders:eventHandler:handle',
      'async',
    )

    mockDetectPerModule.mockReturnValue({
      links: [syncLink],
      timings: {
        callGraphMs: 1,
        configurableMs: 0,
        setupMs: 0,
      },
    })
    mockDetectCrossModule.mockReturnValue({
      links: [asyncLink],
      timings: { asyncDetectionMs: 2 },
    })

    detectConnectionsPerModule([ordersCtx], [orderComp], 'test-repo', false)

    expect(mockDeduplicateCrossStrategy).toHaveBeenCalledWith([syncLink, asyncLink])
  })

  it('skips per-module detection for modules with no components', () => {
    const emptyCtx = createModuleContext('empty')
    const ordersCtx = createModuleContext('orders')
    const orderComp = createComponent('PlaceOrder', 'orders', 'useCase')

    mockDetectPerModule.mockReturnValue({
      links: [],
      timings: {
        callGraphMs: 0,
        configurableMs: 0,
        setupMs: 0,
      },
    })
    mockDetectCrossModule.mockReturnValue({
      links: [],
      timings: { asyncDetectionMs: 0 },
    })

    detectConnectionsPerModule([emptyCtx, ordersCtx], [orderComp], 'test-repo', false)

    expect(mockDetectPerModule).toHaveBeenCalledTimes(1)
  })

  it('returns empty result for empty module contexts', () => {
    mockDetectCrossModule.mockReturnValue({
      links: [],
      timings: { asyncDetectionMs: 0 },
    })

    const result = detectConnectionsPerModule([], [], 'test-repo', false)

    expect(result.links).toStrictEqual([])
    expect(mockDetectPerModule).not.toHaveBeenCalled()
  })

  it('propagates allowIncomplete flag to both phases', () => {
    const ctx = createModuleContext('orders')
    const comp = createComponent('PlaceOrder', 'orders', 'useCase')

    mockDetectPerModule.mockReturnValue({
      links: [],
      timings: {
        callGraphMs: 0,
        configurableMs: 0,
        setupMs: 0,
      },
    })
    mockDetectCrossModule.mockReturnValue({
      links: [],
      timings: { asyncDetectionMs: 0 },
    })

    detectConnectionsPerModule([ctx], [comp], 'test-repo', true)

    expect(mockDetectPerModule).toHaveBeenCalledWith(
      ctx.project,
      [comp],
      expect.objectContaining({ allowIncomplete: true }),
      mockMatchesGlob,
    )
    expect(mockDetectCrossModule).toHaveBeenCalledWith(
      [comp],
      expect.objectContaining({ allowIncomplete: true }),
    )
  })

  it('aggregates timings from per-module and cross-module phases', () => {
    const ctx = createModuleContext('orders')
    const comp = createComponent('PlaceOrder', 'orders', 'useCase')

    mockDetectPerModule.mockReturnValue({
      links: [],
      timings: {
        callGraphMs: 10,
        configurableMs: 5,
        setupMs: 2,
      },
    })
    mockDetectCrossModule.mockReturnValue({
      links: [],
      timings: { asyncDetectionMs: 3 },
    })

    const result = detectConnectionsPerModule([ctx], [comp], 'test-repo', false)

    expect(result.timings).toHaveLength(2)
    expect(result.timings[0]).toStrictEqual({
      callGraphMs: 10,
      asyncDetectionMs: 0,
      configurableMs: 5,
      setupMs: 2,
      totalMs: 17,
    })
    expect(result.timings[1]).toStrictEqual({
      callGraphMs: 0,
      asyncDetectionMs: 3,
      configurableMs: 0,
      setupMs: 0,
      totalMs: 3,
    })
  })
})
