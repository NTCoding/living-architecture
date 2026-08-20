import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { Project } from 'ts-morph'
import {
  type ConnectionsConfig,
  ValidatedConfiguration,
} from '@living-architecture/riviere-extract-config-published-language'
import { DraftComponent } from './component-extraction/draft-component'
import { RiviereProject } from './riviere-project'
import { ExtractionStage } from './extraction-stage'

const {
  mockExtractComponents,
  mockEnrichComponents,
  mockDeduplicateCrossStrategy,
  mockDetectCrossModule,
  mockDetectPerModule,
  mockStripResolvedCustomTypes,
} = vi.hoisted(() => ({
  mockExtractComponents: vi.fn().mockReturnValue([]),
  mockEnrichComponents: vi.fn().mockReturnValue({
    components: [],
    failures: [],
  }),
  mockDeduplicateCrossStrategy: vi.fn((links: { source: string }[]) => links),
  mockDetectPerModule: vi.fn().mockReturnValue({
    links: [
      {
        source: 'orders:useCase:OrderService',
        target: 'orders:repository:OrderRepo',
        type: 'sync',
      },
    ],
    externalLinks: [],
    timings: {
      callGraphMs: 1,
      setupMs: 0,
    },
  }),
  mockDetectCrossModule: vi.fn().mockReturnValue({
    links: [],
    timings: { asyncDetectionMs: 0 },
  }),
  mockStripResolvedCustomTypes: vi.fn((components: unknown[]) => components),
}))

vi.mock('./component-extraction/extractor', () => ({
  extractComponents: mockExtractComponents,
  resolveModuleName: (filePath: string, module: { name: string; modules?: string }) => {
    if (module.modules === undefined) return module.name
    const match = /\/([^/]+)\/[^/]+$/.exec(filePath)
    return match?.[1] ?? module.name
  },
}))

vi.mock('./value-extraction/enrich-components', () => ({
  enrichComponents: mockEnrichComponents,
}))

vi.mock('./connection-detection/detect-connections', () => ({
  detectPerModuleConnections: mockDetectPerModule,
  detectCrossModuleConnections: mockDetectCrossModule,
  deduplicateCrossStrategy: mockDeduplicateCrossStrategy,
}))

vi.mock('./connection-detection/resolve-http-links', () => ({
  stripResolvedCustomTypes: mockStripResolvedCustomTypes,
}))

function createRiviereProject(
  moduleName: string,
  connections?: ConnectionsConfig,
  modules?: string,
  files?: string[],
): RiviereProject {
  const configurationResult = ValidatedConfiguration.parse({
    ...(connections === undefined ? {} : { connections }),
    modules: [
      {
        api: { notUsed: true },
        customTypes: {
          eventSender: {
            find: 'classes',
            where: { hasJSDoc: { tag: 'eventSender' } },
            extract: { publishedEventType: { fromClassName: true } },
          },
        },
        domain: moduleName,
        domainOp: { notUsed: true },
        event: { notUsed: true },
        eventHandler: { notUsed: true },
        glob: 'src/**',
        name: moduleName,
        path: moduleName,
        ...(modules === undefined ? {} : { modules }),
        ui: { notUsed: true },
        useCase: { notUsed: true },
      },
    ],
  })
  assert(configurationResult.success)
  const module = configurationResult.data.modules[0]
  assert(module)
  const stage = ExtractionStage.parse({
    name: moduleName,
    configPath: 'config.yml',
    useTsConfig: false,
    repositoryName: 'test-repo',
    resolvedConfig: configurationResult.data,
    moduleContexts: [
      {
        module,
        files: files ?? [modules === undefined ? 'test.ts' : 'src/checkout/test.ts'],
        project: new Project(),
      },
    ],
  })
  const projectResult = RiviereProject.parse({ stage })
  assert(projectResult.success)
  return projectResult.data
}

describe('RiviereProject.extractDraftComponents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns links when includeConnections is true', () => {
    mockExtractComponents.mockReturnValue([
      DraftComponent.parseOrThrow({
        name: 'OrderService',
        domain: 'orders',
        module: 'orders',
        type: 'useCase',
        location: {
          file: 'test.ts',
          line: 1,
        },
      }),
    ])
    mockEnrichComponents.mockReturnValue({
      components: [
        {
          name: 'OrderService',
          domain: 'orders',
          module: 'orders',
          type: 'useCase',
          location: {
            file: 'test.ts',
            line: 1,
          },
          metadata: {},
        },
      ],
      failures: [],
    })
    mockDetectPerModule.mockReturnValue({
      links: [
        {
          source: 'orders:useCase:OrderService',
          target: 'orders:repository:OrderRepo',
          type: 'sync' as const,
        },
      ],
      externalLinks: [],
      timings: {
        callGraphMs: 1,
        setupMs: 0,
      },
    })

    const eventPublishers = [{ fromType: 'eventSender', metadataKey: 'publishedEventType' }]
    const httpLinks = [
      {
        fromCustomType: 'eventSender',
        matchDomainBy: 'publishedEventType',
        matchApiBy: ['publishedEventType'],
      },
    ]
    const project = createRiviereProject('orders', { eventPublishers, httpLinks })
    const result = project.extractDraftComponents({
      allowIncomplete: true,
      includeConnections: true,
    })

    expect(result).toMatchObject({
      kind: 'full',
      links: [
        {
          source: 'orders:useCase:OrderService',
          target: 'orders:repository:OrderRepo',
          type: 'sync',
        },
      ],
    })
    expect(mockDetectCrossModule).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ eventPublishers }),
    )
    expect(mockDetectPerModule).toHaveBeenCalledWith(
      expect.any(Project),
      expect.any(Array),
      expect.objectContaining({ httpLinks }),
    )
    expect(mockStripResolvedCustomTypes).toHaveBeenCalledWith(
      expect.any(Array),
      httpLinks,
      expect.any(Array),
    )
  })

  it('aggregates connection timings into one project summary', () => {
    mockExtractComponents.mockReturnValue([
      DraftComponent.parseOrThrow({
        name: 'OrderService',
        domain: 'orders',
        module: 'orders',
        type: 'useCase',
        location: { file: 'test.ts', line: 1 },
      }),
    ])
    mockEnrichComponents.mockReturnValue({
      components: [
        {
          name: 'OrderService',
          domain: 'orders',
          module: 'orders',
          type: 'useCase',
          location: { file: 'test.ts', line: 1 },
          metadata: {},
        },
      ],
      failures: [],
    })
    mockDetectPerModule.mockReturnValue({
      links: [],
      externalLinks: [],
      timings: { callGraphMs: 1, setupMs: 2 },
    })
    mockDetectCrossModule.mockReturnValue({ links: [], timings: { asyncDetectionMs: 4 } })

    const result = createRiviereProject('orders').extractDraftComponents({
      allowIncomplete: true,
      includeConnections: true,
    })

    expect(result).toMatchObject({
      timings: [{ callGraphMs: 1, asyncDetectionMs: 4, setupMs: 2, totalMs: 7 }],
    })
  })

  it('retains components from configured submodules', () => {
    mockExtractComponents.mockReturnValue([
      DraftComponent.parseOrThrow({
        name: 'OrderService',
        domain: 'orders',
        module: 'checkout',
        type: 'useCase',
        location: { file: 'src/checkout/test.ts', line: 1 },
      }),
    ])
    mockEnrichComponents.mockReturnValue({ components: [], failures: [] })

    createRiviereProject('orders', undefined, 'src/{module}/').extractDraftComponents({
      allowIncomplete: true,
      includeConnections: true,
    })

    expect(mockEnrichComponents).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          domain: 'orders',
          module: 'checkout',
        }),
      ],
      expect.objectContaining({ name: 'orders' }),
      expect.any(Project),
    )
  })

  it('returns no links when includeConnections is false', () => {
    mockExtractComponents.mockReturnValue([
      DraftComponent.parseOrThrow({
        name: 'OrderService',
        domain: 'orders',
        module: 'orders',
        type: 'useCase',
        location: {
          file: 'test.ts',
          line: 1,
        },
      }),
    ])

    const project = createRiviereProject('orders')
    const result = project.extractDraftComponents({
      allowIncomplete: true,
      includeConnections: false,
    })

    assert(result.kind === 'draftOnly')
    expect(result.components).toStrictEqual([
      expect.objectContaining({
        type: 'useCase',
        name: 'OrderService',
      }),
    ])
  })

  it('extracts only the selected source files', () => {
    mockExtractComponents.mockReturnValue([])
    const project = createRiviereProject('orders', undefined, undefined, [
      'src/orders/selected.ts',
      'src/orders/ignored.ts',
    ])

    project.extractDraftComponents({
      sourceFileSelection: { kind: 'files', filePaths: ['src/orders/selected.ts'] },
      allowIncomplete: true,
      includeConnections: false,
    })

    expect(mockExtractComponents).toHaveBeenCalledWith(
      expect.any(Project),
      ['src/orders/selected.ts'],
      expect.objectContaining({ name: 'orders' }),
    )
  })

  it('normalises absent HTTP-link configuration', () => {
    mockExtractComponents.mockReturnValue([])
    mockEnrichComponents.mockReturnValue({ components: [], failures: [] })
    const project = createRiviereProject('orders')
    project.extractDraftComponents({
      allowIncomplete: true,
      includeConnections: true,
    })

    expect(mockStripResolvedCustomTypes).toHaveBeenCalledWith([], [], expect.any(Array))
  })

  it('returns a field failure when extracted components cannot be enriched', () => {
    mockExtractComponents.mockReturnValue([
      DraftComponent.parseOrThrow({
        name: 'OrderService',
        domain: 'orders',
        module: 'orders',
        type: 'useCase',
        location: { file: 'test.ts', line: 1 },
      }),
    ])
    mockEnrichComponents.mockReturnValue({
      components: [],
      failures: [{ field: 'name' }],
    })

    const result = createRiviereProject('orders').extractDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

    expect(result).toStrictEqual({ kind: 'fieldFailure', failedFields: ['name'] })
  })
})
