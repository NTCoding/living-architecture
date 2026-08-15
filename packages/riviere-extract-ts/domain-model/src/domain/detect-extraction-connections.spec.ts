import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { Project } from 'ts-morph'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { ExtractedLink } from './connection-detection/extracted-link'
import { DetectExtractionConnections } from './detect-extraction-connections'
import { ExtractionStage } from './extraction-stage'
import { EnrichedComponent } from './value-extraction/enriched-component'

const {
  mockDetectPerModuleConnections,
  mockDetectCrossModuleConnections,
  mockDeduplicateCrossStrategy,
} = vi.hoisted(() => ({
  mockDetectPerModuleConnections: vi.fn(),
  mockDetectCrossModuleConnections: vi.fn(),
  mockDeduplicateCrossStrategy: vi.fn((links: ExtractedLink[]) => links),
}))

vi.mock('./connection-detection/detect-connections', () => ({
  detectPerModuleConnections: mockDetectPerModuleConnections,
  detectCrossModuleConnections: mockDetectCrossModuleConnections,
  deduplicateCrossStrategy: mockDeduplicateCrossStrategy,
}))

function createStage(
  withEventPublishers = false,
  modulesPattern: string | undefined = undefined,
  domains: string[] = ['orders', 'shipping'],
): ExtractionStage {
  const result = ValidatedConfiguration.parse({
    ...(withEventPublishers
      ? {
          connections: {
            eventPublishers: [{ fromType: 'eventSender', metadataKey: 'event' }],
            httpLinks: [
              {
                fromCustomType: 'eventSender',
                matchDomainBy: 'event',
                matchApiBy: ['event'],
              },
            ],
          },
        }
      : {}),
    modules: ['orders', 'shipping'].map((name, index) => ({
      name,
      domain: domains[index] ?? name,
      path: name,
      glob: '**/*.ts',
      ...(modulesPattern === undefined ? {} : { modules: modulesPattern }),
      customTypes: {
        eventSender: {
          find: 'classes' as const,
          where: { hasJSDoc: { tag: 'eventSender' } },
          extract: { event: { fromClassName: true } },
        },
      },
      api: { notUsed: true },
      useCase: { notUsed: true },
      domainOp: { notUsed: true },
      event: { notUsed: true },
      eventHandler: { notUsed: true },
      ui: { notUsed: true },
    })),
  })
  assert(result.success)
  return ExtractionStage.parse({
    name: 'test',
    configPath: 'config.json',
    useTsConfig: false,
    repositoryName: 'shop',
    resolvedConfig: result.data,
    moduleContexts: result.data.modules.map((module) => ({
      module,
      files: [modulesPattern === '{module}/' ? 'checkout/order.ts' : `${module.name}/order.ts`],
      project: new Project(),
    })),
  })
}

function createComponent(module: string, name: string, domain = module): EnrichedComponent {
  return EnrichedComponent.parse({
    domain,
    location: { file: `${module}/order.ts`, line: 1 },
    metadata: {},
    module,
    name,
    type: 'useCase',
    _missing: undefined,
  })
}

describe('DetectExtractionConnections.execute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDetectPerModuleConnections.mockReturnValue({
      links: [ExtractedLink.parse({ source: 'orders:useCase:A', target: 'orders:useCase:B' })],
      externalLinks: [],
      timings: { callGraphMs: 2, setupMs: 3 },
    })
    mockDetectCrossModuleConnections.mockReturnValue({
      links: [],
      timings: { asyncDetectionMs: 5 },
    })
  })

  it('detects connections after components have been accumulated', () => {
    const components = [createComponent('orders', 'PlaceOrder')]

    const result = new DetectExtractionConnections().execute(createStage(), components, {
      allowIncomplete: false,
    })

    expect({
      links: result.links,
      externalLinks: result.externalLinks,
      perModuleCallCount: mockDetectPerModuleConnections.mock.calls.length,
    }).toStrictEqual({
      links: [ExtractedLink.parse({ source: 'orders:useCase:A', target: 'orders:useCase:B' })],
      externalLinks: [],
      perModuleCallCount: 1,
    })
    expect(mockDetectPerModuleConnections.mock.calls[0]?.[1]).toStrictEqual(components)
    expect(mockDetectPerModuleConnections.mock.calls[0]?.[2]).toMatchObject({
      allComponents: components,
      allowIncomplete: false,
      repository: 'shop',
      sourceFilePaths: ['orders/order.ts'],
    })
    expect(mockDetectCrossModuleConnections).toHaveBeenCalledWith(
      components,
      expect.objectContaining({ allowIncomplete: false, repository: 'shop' }),
    )
  })

  it('passes configured event publishers to cross-module detection', () => {
    mockDetectPerModuleConnections.mockReturnValue({
      links: [],
      externalLinks: [],
      timings: { callGraphMs: 1, setupMs: 1 },
    })

    new DetectExtractionConnections().execute(
      createStage(true),
      [createComponent('shipping', 'PrepareShipment')],
      { allowIncomplete: false },
    )

    expect(mockDetectCrossModuleConnections).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        eventPublishers: [{ fromType: 'eventSender', metadataKey: 'event' }],
      }),
    )
    expect(mockDetectPerModuleConnections).toHaveBeenCalledTimes(1)
  })

  it('collects external links from per-module detection', () => {
    const externalLink = { source: 'orders:api:Order', target: 'external:api:Shipping' }
    mockDetectPerModuleConnections.mockReturnValue({
      links: [],
      externalLinks: [externalLink],
      timings: { callGraphMs: 1, setupMs: 1 },
    })

    const result = new DetectExtractionConnections().execute(
      createStage(),
      [createComponent('orders', 'PlaceOrder')],
      { allowIncomplete: false },
    )

    expect(result.externalLinks).toStrictEqual([externalLink])
  })

  it('detects connections for components in configured submodules', () => {
    const component = createComponent('checkout', 'PlaceOrder', 'orders')

    const result = new DetectExtractionConnections().execute(
      createStage(false, '{module}/'),
      [component],
      {
        allowIncomplete: false,
      },
    )

    expect(result.links).toStrictEqual([
      ExtractedLink.parse({ source: 'orders:useCase:A', target: 'orders:useCase:B' }),
    ])
    expect(mockDetectPerModuleConnections.mock.calls[0]?.[1]).toStrictEqual([component])
  })

  it('keeps same-domain module components separated by source files', () => {
    const components = [
      createComponent('orders', 'PlaceOrder', 'commerce'),
      createComponent('shipping', 'PrepareShipment', 'commerce'),
    ]

    new DetectExtractionConnections().execute(
      createStage(false, undefined, ['commerce', 'commerce']),
      components,
      { allowIncomplete: false },
    )

    expect(mockDetectPerModuleConnections.mock.calls[0]?.[1]).toStrictEqual([components[0]])
    expect(mockDetectPerModuleConnections.mock.calls[1]?.[1]).toStrictEqual([components[1]])
  })

  it('rejects stage contexts that do not match configured modules', () => {
    const stage = createStage()
    expect(() =>
      ExtractionStage.parse({
        name: stage.name,
        configPath: stage.configPath,
        useTsConfig: stage.useTsConfig,
        repositoryName: stage.repositoryName,
        resolvedConfig: stage.resolvedConfig,
        moduleContexts: [],
      }),
    ).toThrowError(new TypeError('Module contexts must match resolved configuration exactly'))
  })

  it('rejects duplicate stage contexts', () => {
    const stage = createStage()
    const firstContext = stage.moduleContexts[0]
    assert(firstContext)

    expect(() =>
      ExtractionStage.parse({
        name: stage.name,
        configPath: stage.configPath,
        useTsConfig: stage.useTsConfig,
        repositoryName: stage.repositoryName,
        resolvedConfig: stage.resolvedConfig,
        moduleContexts: [firstContext, firstContext],
      }),
    ).toThrowError(new TypeError('Module contexts must match resolved configuration exactly'))
  })

  it('rejects a context from a foreign configuration', () => {
    const stage = createStage()
    const foreignResult = ValidatedConfiguration.parse({
      modules: [
        {
          name: 'billing',
          domain: 'billing',
          path: 'billing',
          glob: '**/*.ts',
          api: { notUsed: true },
          useCase: { notUsed: true },
          domainOp: { notUsed: true },
          event: { notUsed: true },
          eventHandler: { notUsed: true },
          ui: { notUsed: true },
        },
      ],
    })
    assert(foreignResult.success)
    const foreignModule = foreignResult.data.modules[0]
    assert(foreignModule)
    const firstContext = stage.moduleContexts[0]
    assert(firstContext)

    expect(() =>
      ExtractionStage.parse({
        name: stage.name,
        configPath: stage.configPath,
        useTsConfig: stage.useTsConfig,
        repositoryName: stage.repositoryName,
        resolvedConfig: stage.resolvedConfig,
        moduleContexts: [
          firstContext,
          { module: foreignModule, files: [], project: new Project() },
        ],
      }),
    ).toThrowError(new TypeError('Module contexts must match resolved configuration exactly'))
  })

  it('reports a missing context at the service boundary', () => {
    const stage = createStage()
    const invalidStage = Object.assign(Object.create(Object.getPrototypeOf(stage)), {
      ...stage,
      moduleContexts: [],
    })

    expect(() =>
      new DetectExtractionConnections().execute(invalidStage, [], { allowIncomplete: false }),
    ).toThrowError(new TypeError("Missing context for module 'orders'"))
  })
})
