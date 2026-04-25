import { Project } from 'ts-morph'
import type { Module } from '@living-architecture/riviere-extract-config'
import type { DraftComponent } from './component-extraction/extractor'
import type { EnrichedComponent } from './value-extraction/enrich-components'
import type { ExtractionWritePort } from './extraction-write-port'

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

import * as extractIntoModule from './extract-into'

function createModule(name: string, domain = 'orders'): Module {
  return {
    api: { notUsed: true },
    domain,
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    glob: 'src/**',
    name,
    path: name,
    ui: { notUsed: true },
    useCase: { notUsed: true },
  }
}

function createProjectWithDispose(): {
  project: Project
  dispose: ReturnType<typeof vi.fn>
} {
  const project = new Project({ useInMemoryFileSystem: true })
  const dispose = vi.fn()
  Object.defineProperty(project, 'dispose', { value: dispose })
  return {
    project,
    dispose,
  }
}

function createWritePortRecorder() {
  const components: unknown[] = []
  const links: unknown[] = []
  const externalLinks: unknown[] = []
  const missingFields: unknown[] = []
  const uncertainLinks: unknown[] = []

  const writePort: ExtractionWritePort = {
    addComponent(input) {
      components.push(input)
    },
    addLink(input) {
      links.push(input)
    },
    addExternalLink(input) {
      externalLinks.push(input)
    },
    reportMissingField(event) {
      missingFields.push(event)
    },
    reportUncertainLink(event) {
      uncertainLinks.push(event)
    },
  }

  return {
    writePort,
    components,
    links,
    externalLinks,
    missingFields,
    uncertainLinks,
  }
}

function createDraftComponent(module = 'orders-module'): DraftComponent {
  return {
    type: 'useCase',
    name: 'PlaceOrder',
    domain: 'orders',
    module,
    location: {
      file: '/workspace/orders/place-order.ts',
      line: 7,
    },
  }
}

function createEnrichedComponent(module = 'orders-module', missing?: string[]): EnrichedComponent {
  return {
    ...createDraftComponent(module),
    metadata: {},
    ...(missing === undefined ? {} : { _missing: missing }),
  }
}

describe('extractInto branch coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns draftOnly in enrich mode when no draft components are provided and still disposes projects', () => {
    const projectWithDispose = createProjectWithDispose()
    const project = projectWithDispose.project
    const dispose = projectWithDispose.dispose
    const module = createModule('orders-module')
    const recorder = createWritePortRecorder()

    const result = extractIntoModule.extractInto(
      recorder.writePort,
      { modules: [module] },
      {
        allowIncomplete: false,
        configDir: '/workspace',
        includeConnections: false,
        mode: 'enrich',
        repository: 'test/repo',
        globMatcher: vi.fn(),
        moduleContexts: [
          {
            module,
            files: [],
            project,
          },
        ],
      },
    )

    expect(result).toStrictEqual({
      kind: 'draftOnly',
      components: [],
    })
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('skips project disposal when disposeProjects is false', () => {
    const projectWithDispose = createProjectWithDispose()
    const project = projectWithDispose.project
    const dispose = projectWithDispose.dispose
    const module = createModule('orders-module')

    const result = extractIntoModule.extractInto(
      createWritePortRecorder().writePort,
      { modules: [module] },
      {
        allowIncomplete: false,
        configDir: '/workspace',
        includeConnections: false,
        mode: 'enrich',
        repository: 'test/repo',
        globMatcher: vi.fn(),
        moduleContexts: [
          {
            module,
            files: [],
            project,
          },
        ],
        disposeProjects: false,
      },
    )

    expect(result).toStrictEqual({
      kind: 'draftOnly',
      components: [],
    })
    expect(dispose).not.toHaveBeenCalled()
  })

  it('returns field failures in strict mode and skips module contexts with no matching drafts', () => {
    const ordersProject = createProjectWithDispose()
    const shippingProject = createProjectWithDispose()
    const ordersModule = createModule('orders-module')
    const shippingModule = createModule('shipping-module', 'shipping')

    mockEnrichComponents.mockReturnValueOnce({
      components: [createEnrichedComponent('orders-module', ['operationName'])],
      failures: [
        {
          component: createDraftComponent('orders-module'),
          field: 'operationName',
          error: 'operation missing',
        },
      ],
    })

    const result = extractIntoModule.extractInto(
      createWritePortRecorder().writePort,
      { modules: [ordersModule, shippingModule] },
      {
        allowIncomplete: false,
        configDir: '/workspace',
        draftComponents: [createDraftComponent('orders-module')],
        includeConnections: true,
        mode: 'enrich',
        repository: 'test/repo',
        globMatcher: vi.fn(),
        moduleContexts: [
          {
            module: ordersModule,
            files: [],
            project: ordersProject.project,
          },
          {
            module: shippingModule,
            files: [],
            project: shippingProject.project,
          },
        ],
      },
    )

    expect(result).toStrictEqual({
      kind: 'fieldFailure',
      failedFields: ['operationName'],
    })
    expect(mockEnrichComponents).toHaveBeenCalledTimes(1)
    expect(ordersProject.dispose).toHaveBeenCalledTimes(1)
    expect(shippingProject.dispose).toHaveBeenCalledTimes(1)
  })

  it('throws an orphaned draft component error when draft modules are unknown', () => {
    const { project } = createProjectWithDispose()
    const module = createModule('orders-module')

    expect(() =>
      extractIntoModule.extractInto(
        createWritePortRecorder().writePort,
        { modules: [module] },
        {
          allowIncomplete: true,
          configDir: '/workspace',
          draftComponents: [createDraftComponent('ghost-module')],
          includeConnections: true,
          mode: 'enrich',
          repository: 'test/repo',
          globMatcher: vi.fn(),
          moduleContexts: [
            {
              module,
              files: [],
              project,
            },
          ],
        },
      ),
    ).toThrow(extractIntoModule.OrphanedDraftComponentError)
  })

  it('reports uncertain and external links while honoring configured event publishers', () => {
    const { project } = createProjectWithDispose()
    const module = createModule('orders-module')
    const recorder = createWritePortRecorder()
    const enrichedComponent = createEnrichedComponent('orders-module')

    mockExtractComponents.mockReturnValueOnce([createDraftComponent('orders-module')])
    mockEnrichComponents.mockReturnValueOnce({
      components: [enrichedComponent],
      failures: [],
    })
    mockDetectPerModuleConnections.mockReturnValueOnce({
      links: [
        {
          source: 'orders:checkout:usecase:placeorder',
          target: 'orders:inventory:usecase:reserveinventory',
          type: 'sync',
          _uncertain: 'receiver type unresolved',
        },
      ],
      externalLinks: [
        {
          source: 'orders:checkout:usecase:placeorder',
          target: { name: 'External Orders API' },
          type: 'sync',
          description: 'http call',
          sourceLocation: {
            repository: 'test/repo',
            filePath: '/workspace/orders/place-order.ts',
            lineNumber: 12,
          },
        },
      ],
      timings: {
        callGraphMs: 1,
        setupMs: 2,
      },
    })
    mockDetectCrossModuleConnections.mockReturnValueOnce({
      links: [],
      timings: { asyncDetectionMs: 3 },
    })

    extractIntoModule.extractInto(
      recorder.writePort,
      {
        modules: [module],
        connections: {
          eventPublishers: [
            {
              fromType: 'backgroundJob',
              metadataKey: 'eventName',
            },
          ],
        },
      },
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
            project,
          },
        ],
      },
    )

    expect(mockDetectCrossModuleConnections).toHaveBeenCalledWith([enrichedComponent], {
      allowIncomplete: true,
      repository: 'test/repo',
      eventPublishers: [
        {
          fromType: 'backgroundJob',
          metadataKey: 'eventName',
        },
      ],
    })
    expect(recorder.uncertainLinks).toStrictEqual([
      {
        source: 'orders:checkout:usecase:placeorder',
        target: 'orders:inventory:usecase:reserveinventory',
        linkType: 'sync',
        reason: 'receiver type unresolved',
      },
    ])
    expect(recorder.links).toStrictEqual([
      {
        from: 'orders:checkout:usecase:placeorder',
        to: 'orders:inventory:usecase:reserveinventory',
        type: 'sync',
      },
    ])
    expect(recorder.externalLinks).toStrictEqual([
      {
        from: 'orders:checkout:usecase:placeorder',
        target: { name: 'External Orders API' },
        type: 'sync',
        description: 'http call',
        sourceLocation: {
          repository: 'test/repo',
          filePath: '/workspace/orders/place-order.ts',
          lineNumber: 12,
        },
      },
    ])
  })
})
