import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import { Project } from 'ts-morph'
import type { Module } from '@living-architecture/riviere-extract-config'
import type {
  CrossModuleDetectionResult,
  EnrichedComponent,
  ExtractedLink,
  PerModuleDetectionResult,
} from '@living-architecture/riviere-extract-ts'
import {
  ExtractionProject, type ModuleContext 
} from './extraction-project'

const {
  mockDeduplicateCrossStrategy,
  mockDetectCrossModule,
  mockDetectPerModule,
  mockMatchesGlob,
} = vi.hoisted(() => ({
  mockDeduplicateCrossStrategy: vi.fn((links: ExtractedLink[]) => links),
  mockDetectCrossModule: vi.fn(),
  mockDetectPerModule: vi.fn(),
  mockMatchesGlob: vi.fn(),
}))

vi.mock('@living-architecture/riviere-extract-ts', () => ({
  deduplicateCrossStrategy: mockDeduplicateCrossStrategy,
  detectCrossModuleConnections: mockDetectCrossModule,
  detectPerModuleConnections: mockDetectPerModule,
  matchesGlob: mockMatchesGlob,
}))

function createModule(name: string): Module {
  return {
    api: { notUsed: true },
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    eventPublisher: { notUsed: true },
    glob: 'src/**',
    name,
    path: name,
    ui: { notUsed: true },
    useCase: { notUsed: true },
  }
}

function createModuleContext(moduleName: string): ModuleContext {
  return {
    files: [],
    module: createModule(moduleName),
    project: new Project(),
  }
}

function createExtractionProject(moduleContexts: ModuleContext[]): ExtractionProject {
  return new ExtractionProject('/config', moduleContexts, { modules: [] })
}

function createComponent(
  name: string,
  domain: string,
  type: string,
  metadata: Record<string, string | number | boolean> = {},
): EnrichedComponent {
  return {
    domain,
    location: {
      file: `/src/${domain}/${name}.ts`,
      line: 1,
    },
    metadata,
    name,
    type,
  }
}

function createLink(source: string, target: string, type: 'sync' | 'async'): ExtractedLink {
  return {
    source,
    target,
    type,
  }
}

describe('ExtractionProject.detectConnections', () => {
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

    createExtractionProject([ordersCtx, shippingCtx]).detectConnections(
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

    createExtractionProject([ordersCtx]).detectConnections(
      [orderComp, shippingComp],
      'test-repo',
      false,
    )

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

    createExtractionProject([ordersCtx]).detectConnections([orderComp], 'test-repo', false)

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

    createExtractionProject([emptyCtx, ordersCtx]).detectConnections(
      [orderComp],
      'test-repo',
      false,
    )

    expect(mockDetectPerModule).toHaveBeenCalledTimes(1)
  })

  it('returns empty result for empty module contexts', () => {
    mockDetectCrossModule.mockReturnValue({
      links: [],
      timings: { asyncDetectionMs: 0 },
    })

    const result = createExtractionProject([]).detectConnections([], 'test-repo', false)

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

    createExtractionProject([ctx]).detectConnections([comp], 'test-repo', true)

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

    const result = createExtractionProject([ctx]).detectConnections([comp], 'test-repo', false)

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
