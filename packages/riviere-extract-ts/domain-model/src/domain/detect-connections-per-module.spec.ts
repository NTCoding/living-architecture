import { assert, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { Project } from 'ts-morph'
import {
  type ConnectionsConfig,
  ValidatedConfiguration,
} from '@living-architecture/riviere-extract-config-published-language'
import { DraftComponent } from './component-extraction/draft-component'
import { RiviereProject } from './riviere-project'
import { RiviereModule } from './riviere-module'
import { ExtractionConfiguration } from './extraction-configuration'
import { EnrichmentFailure, EnrichmentResult } from './value-extraction/enriched-component'
import { TestFixtureError } from './value-extraction/literal-detection'

const { mockExtractComponents, mockStripResolvedCustomTypes } = vi.hoisted(() => ({
  mockExtractComponents: vi.fn().mockReturnValue([]),
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

vi.mock('./connection-detection/resolve-http-links', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./connection-detection/resolve-http-links')>()),
  stripResolvedCustomTypes: mockStripResolvedCustomTypes,
}))

const moduleEnrichment: {
  spy: MockInstance<RiviereModule['enrichDraftComponents']> | undefined
} = {
  spy: undefined,
}

function enrichmentSpy() {
  const spy = moduleEnrichment.spy
  if (spy === undefined) throw new TestFixtureError('Expected module enrichment spy')
  return spy
}

function calledModule(): RiviereModule {
  const value: unknown = enrichmentSpy().mock.contexts[0]
  if (!(value instanceof RiviereModule)) throw new TestFixtureError('Expected RiviereModule')
  return value
}

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
  const configuration = ExtractionConfiguration.parse({
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
  const projectResult = RiviereProject.parse({ configuration, draftComponents: [] })
  assert(projectResult.success)
  return projectResult.data
}

describe('RiviereProject.extractDraftComponents', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
    moduleEnrichment.spy = vi.spyOn(RiviereModule.prototype, 'enrichDraftComponents')
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
    createRiviereProject('orders', undefined, 'src/{module}/').extractDraftComponents({
      allowIncomplete: true,
      includeConnections: true,
    })

    expect(calledModule().draftComponents()).toStrictEqual([
      expect.objectContaining({ domain: 'orders', module: 'checkout' }),
    ])
    expect(calledModule().name()).toBe('orders')
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
    const failedDraft = DraftComponent.parseOrThrow({
      name: 'OrderService',
      domain: 'orders',
      module: 'orders',
      type: 'useCase',
      location: { file: 'test.ts', line: 1 },
    })
    enrichmentSpy().mockReturnValue(
      EnrichmentResult.parse({
        components: [],
        failures: [
          EnrichmentFailure.parse({
            component: failedDraft,
            field: 'name',
            error: 'Could not extract name',
          }),
        ],
      }),
    )

    const result = createRiviereProject('orders').extractDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

    expect(result).toStrictEqual({ kind: 'fieldFailure', failedFields: ['name'] })
  })
})
