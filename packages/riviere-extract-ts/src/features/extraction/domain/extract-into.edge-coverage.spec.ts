import {
  createDraftComponent,
  createEnrichedComponent,
  createModule,
  createProjectWithDispose,
  createWritePortRecorder,
} from './extract-into-fixtures'

const {
  mockExtractComponents,
  mockEnrichComponents,
  mockDetectPerModuleConnections,
  mockDetectCrossModuleConnections,
  mockDeduplicateCrossStrategy,
} = vi.hoisted(() => ({
  mockExtractComponents: vi.fn(),
  mockEnrichComponents: vi.fn(),
  mockDetectPerModuleConnections: vi.fn(),
  mockDetectCrossModuleConnections: vi.fn(),
  mockDeduplicateCrossStrategy: vi.fn((links: unknown[]) => links),
}))

vi.mock('./component-extraction/extractor', async () => {
  const actual = await vi.importActual<typeof import('./component-extraction/extractor')>(
    './component-extraction/extractor',
  )

  return {
    ...actual,
    extractComponents: mockExtractComponents,
  }
})

vi.mock('./value-extraction/enrich-components', async () => {
  const actual = await vi.importActual<typeof import('./value-extraction/enrich-components')>(
    './value-extraction/enrich-components',
  )

  return {
    ...actual,
    enrichComponents: mockEnrichComponents,
  }
})

vi.mock('./connection-detection/detect-connections', async () => {
  const actual = await vi.importActual<typeof import('./connection-detection/detect-connections')>(
    './connection-detection/detect-connections',
  )

  return {
    ...actual,
    detectPerModuleConnections: mockDetectPerModuleConnections,
    detectCrossModuleConnections: mockDetectCrossModuleConnections,
    deduplicateCrossStrategy: mockDeduplicateCrossStrategy,
  }
})

import { extractInto } from './extract-into'

describe('extractInto edge coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips connection detection for module contexts that have no enriched components', () => {
    const ordersProject = createProjectWithDispose()
    const shippingProject = createProjectWithDispose()
    const ordersModule = createModule('orders-module')
    const shippingModule = createModule('shipping-module', 'shipping')

    mockExtractComponents.mockReturnValueOnce([createDraftComponent('orders-module')])
    mockExtractComponents.mockReturnValueOnce([])
    mockEnrichComponents.mockReturnValueOnce({
      components: [createEnrichedComponent('orders-module')],
      failures: [],
    })
    mockDetectPerModuleConnections.mockReturnValueOnce({
      links: [],
      externalLinks: [],
      timings: {
        callGraphMs: 1,
        setupMs: 1,
      },
    })
    mockDetectCrossModuleConnections.mockReturnValueOnce({
      links: [],
      timings: { asyncDetectionMs: 0 },
    })

    extractInto(
      createWritePortRecorder().writePort,
      { modules: [ordersModule, shippingModule] },
      {
        allowIncomplete: true,
        configDir: '/workspace',
        includeConnections: true,
        mode: 'extract',
        repository: 'test/repo',
        globMatcher: vi.fn(),
        moduleContexts: [
          {
            module: ordersModule,
            files: ['/workspace/orders/place-order.ts'],
            project: ordersProject.project,
          },
          {
            module: shippingModule,
            files: ['/workspace/shipping/place-order.ts'],
            project: shippingProject.project,
          },
        ],
      },
    )

    expect(mockDetectPerModuleConnections).toHaveBeenCalledTimes(1)
  })

  it('skips missing-field reports when a missing marker has no indexed failure reason', () => {
    const project = createProjectWithDispose()
    const module = createModule('orders-module')
    const recorder = createWritePortRecorder()

    mockExtractComponents.mockReturnValueOnce([createDraftComponent('orders-module')])
    mockEnrichComponents.mockReturnValueOnce({
      components: [createEnrichedComponent('orders-module', ['operationName'])],
      failures: [],
    })
    mockDetectPerModuleConnections.mockReturnValueOnce({
      links: [],
      externalLinks: [],
      timings: {
        callGraphMs: 1,
        setupMs: 1,
      },
    })
    mockDetectCrossModuleConnections.mockReturnValueOnce({
      links: [],
      timings: { asyncDetectionMs: 0 },
    })

    extractInto(
      recorder.writePort,
      { modules: [module] },
      {
        allowIncomplete: true,
        configDir: '/workspace',
        includeConnections: true,
        mode: 'extract',
        repository: 'test/repo',
        globMatcher: vi.fn(),
        moduleContexts: [
          {
            module,
            files: ['/workspace/orders/place-order.ts'],
            project: project.project,
          },
        ],
      },
    )

    expect(recorder.missingFields).toStrictEqual([])
  })

  it('defaults uncertain link diagnostics to sync when link type is missing', () => {
    const project = createProjectWithDispose()
    const module = createModule('orders-module')
    const recorder = createWritePortRecorder()

    mockExtractComponents.mockReturnValueOnce([createDraftComponent('orders-module')])
    mockEnrichComponents.mockReturnValueOnce({
      components: [createEnrichedComponent('orders-module')],
      failures: [],
    })
    mockDetectPerModuleConnections.mockReturnValueOnce({
      links: [
        {
          source: 'orders:checkout:usecase:placeorder',
          target: 'orders:inventory:usecase:reserveinventory',
          _uncertain: 'receiver type unresolved',
        },
      ],
      externalLinks: [],
      timings: {
        callGraphMs: 1,
        setupMs: 1,
      },
    })
    mockDetectCrossModuleConnections.mockReturnValueOnce({
      links: [],
      timings: { asyncDetectionMs: 0 },
    })

    extractInto(
      recorder.writePort,
      { modules: [module] },
      {
        allowIncomplete: true,
        configDir: '/workspace',
        includeConnections: true,
        mode: 'extract',
        repository: 'test/repo',
        globMatcher: vi.fn(),
        moduleContexts: [
          {
            module,
            files: ['/workspace/orders/place-order.ts'],
            project: project.project,
          },
        ],
      },
    )

    expect(recorder.uncertainLinks).toStrictEqual([
      {
        source: 'orders:checkout:usecase:placeorder',
        target: 'orders:inventory:usecase:reserveinventory',
        linkType: 'sync',
        reason: 'receiver type unresolved',
      },
    ])
  })

  it('writes certain links without reporting uncertain diagnostics', () => {
    const project = createProjectWithDispose()
    const module = createModule('orders-module')
    const recorder = createWritePortRecorder()

    mockExtractComponents.mockReturnValueOnce([createDraftComponent('orders-module')])
    mockEnrichComponents.mockReturnValueOnce({
      components: [createEnrichedComponent('orders-module')],
      failures: [],
    })
    mockDetectPerModuleConnections.mockReturnValueOnce({
      links: [
        {
          source: 'orders:checkout:usecase:placeorder',
          target: 'orders:inventory:usecase:reserveinventory',
          type: 'sync',
        },
      ],
      externalLinks: [],
      timings: {
        callGraphMs: 1,
        setupMs: 1,
      },
    })
    mockDetectCrossModuleConnections.mockReturnValueOnce({
      links: [],
      timings: { asyncDetectionMs: 0 },
    })

    extractInto(
      recorder.writePort,
      { modules: [module] },
      {
        allowIncomplete: true,
        configDir: '/workspace',
        includeConnections: true,
        mode: 'extract',
        repository: 'test/repo',
        globMatcher: vi.fn(),
        moduleContexts: [
          {
            module,
            files: ['/workspace/orders/place-order.ts'],
            project: project.project,
          },
        ],
      },
    )

    expect(recorder.uncertainLinks).toStrictEqual([])
    expect(recorder.links).toStrictEqual([
      {
        from: 'orders:checkout:usecase:placeorder',
        to: 'orders:inventory:usecase:reserveinventory',
        type: 'sync',
      },
    ])
  })
})
