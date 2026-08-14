import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { Project } from 'ts-morph'
import {
  type ConnectionsConfig,
  ValidatedConfiguration,
} from '@living-architecture/riviere-extract-config-published-language'
import { DraftComponent } from './component-extraction/draft-component'
import { ExtractionProject } from './extraction-project'

const {
  mockExtractComponents,
  mockEnrichComponents,
  mockDeduplicateCrossStrategy,
  mockDetectCrossModule,
  mockDetectPerModule,
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
}))

vi.mock('./component-extraction/extractor', () => ({
  extractComponents: mockExtractComponents,
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
  stripResolvedCustomTypes: vi.fn((components: unknown[]) => components),
}))

function createExtractionProject(
  moduleName: string,
  connections?: ConnectionsConfig,
): ExtractionProject {
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
        ui: { notUsed: true },
        useCase: { notUsed: true },
      },
    ],
  })
  assert(configurationResult.success)
  const module = configurationResult.data.modules[0]
  assert(module)
  const projectResult = ExtractionProject.parse({
    configuration: configurationResult.data,
    moduleSources: new Map([
      [module, { files: [`/src/${moduleName}/test.ts`], project: new Project() }],
    ]),
    repositoryName: 'test-repo',
  })
  assert(projectResult.success)
  return projectResult.data
}

describe('ExtractionProject.extractDraftComponents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns links when includeConnections is true', () => {
    mockExtractComponents.mockReturnValue([
      DraftComponent.parse({
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
    const project = createExtractionProject('orders', { eventPublishers })
    const result = project.extractDraftComponents({
      allowIncomplete: true,
      includeConnections: true,
    })

    expect(result.kind).toBe('full')
    expect(mockDetectCrossModule).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ eventPublishers }),
    )
  })

  it('returns no links when includeConnections is false', () => {
    mockExtractComponents.mockReturnValue([
      DraftComponent.parse({
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

    const project = createExtractionProject('orders')
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

  it('returns a field failure when extracted components cannot be enriched', () => {
    mockExtractComponents.mockReturnValue([
      DraftComponent.parse({
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

    const result = createExtractionProject('orders').extractDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

    expect(result).toStrictEqual({ kind: 'fieldFailure', failedFields: ['name'] })
  })
})

describe('ExtractionProject.parse', () => {
  it('rejects missing and foreign module sources', () => {
    const orders = ValidatedConfiguration.parse({
      modules: [
        {
          name: 'orders',
          domain: 'orders',
          path: '.',
          glob: '**',
          api: { notUsed: true },
          useCase: { notUsed: true },
          domainOp: { notUsed: true },
          event: { notUsed: true },
          eventHandler: { notUsed: true },
          ui: { notUsed: true },
        },
      ],
    })
    const billing = ValidatedConfiguration.parse({
      modules: [
        {
          name: 'billing',
          domain: 'billing',
          path: '.',
          glob: '**',
          api: { notUsed: true },
          useCase: { notUsed: true },
          domainOp: { notUsed: true },
          event: { notUsed: true },
          eventHandler: { notUsed: true },
          ui: { notUsed: true },
        },
      ],
    })
    assert(orders.success)
    assert(billing.success)
    const foreignModule = billing.data.modules[0]
    assert(foreignModule)

    const result = ExtractionProject.parse({
      configuration: orders.data,
      moduleSources: new Map([[foreignModule, { files: [], project: new Project() }]]),
      repositoryName: 'test-repo',
    })

    expect(result).toMatchObject({
      success: false,
      error: "Missing source for module 'orders'\nSource supplied for unknown module 'billing'",
    })
  })
})
