import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { Project } from 'ts-morph'
import {
  type ComponentRule,
  ValidatedConfiguration,
  ValidatedModule,
  type ValidatedModuleInput,
} from '@living-architecture/riviere-extract-config-published-language'
import { DraftComponent } from './component-extraction/draft-component'
import type { ExtractedLink } from './connection-detection/extracted-link'
import { ExtractionProject, OrphanedDraftComponentError } from './extraction-project'

const {
  mockEnrichComponents,
  mockDetectPerModuleConnections,
  mockDetectCrossModuleConnections,
  mockDeduplicateCrossStrategy,
} = vi.hoisted(() => ({
  mockEnrichComponents: vi.fn(),
  mockDetectPerModuleConnections: vi.fn().mockReturnValue({
    links: [],
    externalLinks: [],
    timings: {
      callGraphMs: 0,
      setupMs: 0,
    },
  }),
  mockDetectCrossModuleConnections: vi.fn().mockReturnValue({
    links: [],
    timings: { asyncDetectionMs: 0 },
  }),
  mockDeduplicateCrossStrategy: vi.fn((links: ExtractedLink[]): ExtractedLink[] => links),
}))

vi.mock('./value-extraction/enrich-components', () => ({
  enrichComponents: mockEnrichComponents,
}))

vi.mock('./connection-detection/detect-connections', () => ({
  detectPerModuleConnections: mockDetectPerModuleConnections,
  detectCrossModuleConnections: mockDetectCrossModuleConnections,
  deduplicateCrossStrategy: mockDeduplicateCrossStrategy,
}))

vi.mock('./connection-detection/resolve-http-links', () => ({
  stripResolvedCustomTypes: vi.fn((components: unknown[]) => components),
}))

const notUsedRule: ComponentRule = { notUsed: true }

function createModule(name: string, modules?: string): ValidatedModuleInput {
  return {
    api: notUsedRule,
    domain: name,
    domainOp: notUsedRule,
    event: notUsedRule,
    eventHandler: notUsedRule,
    glob: 'src/**',
    name,
    ...(modules === undefined ? {} : { modules }),
    path: name,
    ui: notUsedRule,
    useCase: notUsedRule,
  }
}

function createModuleContext(moduleName: string) {
  return {
    files: [],
    moduleName,
    project: new Project(),
  }
}

function createDraft(
  domain: string,
  name: string,
  module = domain,
  file = 'test.ts',
): DraftComponent {
  return DraftComponent.parse({
    domain,
    location: {
      file,
      line: 1,
    },
    name,
    module,
    type: 'api',
  })
}

function calledModuleName(callIndex: number): string {
  const value: unknown = mockEnrichComponents.mock.calls[callIndex]?.[1]
  if (!(value instanceof ValidatedModule)) throw new TypeError('Expected validated module')
  return value.name
}

function createExtractionProject(
  moduleContexts: Array<{
    files: string[]
    moduleName: string
    modules?: string
    project: Project
  }>,
  draftComponents: DraftComponent[] = [],
): ExtractionProject {
  const configurationResult = ValidatedConfiguration.parse({
    modules: moduleContexts.map((context) => createModule(context.moduleName, context.modules)),
  })
  assert(configurationResult.success)
  const moduleSources = new Map<ValidatedModule, { files: string[]; project: Project }>()
  configurationResult.data.modules.forEach((module, index) => {
    const context = moduleContexts[index]
    assert(context)
    moduleSources.set(module, { files: context.files, project: context.project })
  })
  const projectResult = ExtractionProject.parse({
    configuration: configurationResult.data,
    moduleSources,
    repositoryName: 'test-repo',
    draftComponents,
  })
  assert(projectResult.success)
  return projectResult.data
}

describe('ExtractionProject.enrichDraftComponents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enriches drafts grouped by module', () => {
    mockEnrichComponents
      .mockReturnValueOnce({
        components: [
          {
            domain: 'orders',
            name: 'CompA',
          },
        ],
        failures: [],
      })
      .mockReturnValueOnce({
        components: [
          {
            domain: 'shipping',
            name: 'CompB',
          },
        ],
        failures: [],
      })

    const result = createExtractionProject(
      [createModuleContext('orders'), createModuleContext('shipping')],
      [
        createDraft('orders', 'CompA'),
        createDraft('orders', 'CompA2'),
        createDraft('shipping', 'CompB'),
      ],
    ).enrichDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

    assert(result.kind === 'full')
    expect(result.components).toHaveLength(2)
    expect(mockEnrichComponents).toHaveBeenCalledTimes(2)
  })

  it('routes correct drafts to each module', () => {
    mockEnrichComponents.mockReturnValue({
      components: [],
      failures: [],
    })

    createExtractionProject(
      [createModuleContext('orders'), createModuleContext('shipping')],
      [createDraft('orders', 'CompA'), createDraft('shipping', 'CompB')],
    ).enrichDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

    expect([
      {
        drafts: mockEnrichComponents.mock.calls[0]?.[0],
        moduleName: calledModuleName(0),
      },
      {
        drafts: mockEnrichComponents.mock.calls[1]?.[0],
        moduleName: calledModuleName(1),
      },
    ]).toStrictEqual([
      { drafts: [createDraft('orders', 'CompA')], moduleName: 'orders' },
      { drafts: [createDraft('shipping', 'CompB')], moduleName: 'shipping' },
    ])
  })

  it('deduplicates failed fields across modules', () => {
    mockEnrichComponents
      .mockReturnValueOnce({
        components: [],
        failures: [{ field: 'name' }],
      })
      .mockReturnValueOnce({
        components: [],
        failures: [{ field: 'name' }, { field: 'type' }],
      })

    const result = createExtractionProject(
      [createModuleContext('orders'), createModuleContext('shipping')],
      [createDraft('orders', 'A'), createDraft('shipping', 'B')],
    ).enrichDraftComponents({
      allowIncomplete: true,
      includeConnections: true,
    })

    assert(result.kind === 'full')
    expect(result.components).toHaveLength(0)
    expect(result.failedFields).toStrictEqual(['name', 'type'])
  })

  it('skips modules with no matching drafts', () => {
    mockEnrichComponents.mockReturnValue({
      components: [],
      failures: [],
    })

    const result = createExtractionProject(
      [createModuleContext('orders'), createModuleContext('empty')],
      [createDraft('orders', 'A')],
    ).enrichDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

    expect(mockEnrichComponents).toHaveBeenCalledTimes(1)
    assert(result.kind === 'full')
    expect(result.components).toStrictEqual([])
  })

  it('throws OrphanedDraftComponentError when drafts reference unknown modules', () => {
    expect(() =>
      createExtractionProject(
        [createModuleContext('orders')],
        [createDraft('orders', 'A'), createDraft('unknown-module', 'B')],
      ).enrichDraftComponents({
        allowIncomplete: false,
        includeConnections: true,
      }),
    ).toThrow(OrphanedDraftComponentError)
  })

  it('includes unexpected domains in orphan error message', () => {
    expect(() =>
      createExtractionProject(
        [createModuleContext('orders')],
        [createDraft('ghost', 'X')],
      ).enrichDraftComponents({
        allowIncomplete: false,
        includeConnections: true,
      }),
    ).toThrow(
      'Draft components reference unexpected domains: [ghost]. Configured domains: [orders]',
    )
  })

  it('groups configured submodule drafts under their parent module', () => {
    mockEnrichComponents.mockReturnValue({ components: [], failures: [] })

    createExtractionProject(
      [
        {
          files: ['src/checkout/test.ts'],
          moduleName: 'orders',
          modules: 'src/{module}/',
          project: new Project(),
        },
      ],
      [createDraft('orders', 'CompA', 'checkout', 'src/checkout/test.ts')],
    ).enrichDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

    expect(mockEnrichComponents).toHaveBeenCalledWith(
      [createDraft('orders', 'CompA', 'checkout', 'src/checkout/test.ts')],
      expect.objectContaining({ name: 'orders' }),
      expect.any(Project),
    )
  })

  it('returns empty result when no drafts provided', () => {
    const result = createExtractionProject(
      [createModuleContext('orders')],
      [],
    ).enrichDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

    assert(result.kind === 'full')
    expect(result.components).toStrictEqual([])
    expect(mockEnrichComponents).not.toHaveBeenCalled()
  })

  it('returns field failure when enrichment fails and incomplete is disabled', () => {
    mockEnrichComponents.mockReturnValue({
      components: [],
      failures: [{ field: 'name' }],
    })

    const result = createExtractionProject(
      [createModuleContext('orders')],
      [createDraft('orders', 'A')],
    ).enrichDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

    expect(result).toStrictEqual({
      kind: 'fieldFailure',
      failedFields: ['name'],
    })
  })

  it('returns draftOnly when includeConnections is false', () => {
    const result = createExtractionProject(
      [createModuleContext('orders')],
      [createDraft('orders', 'CompA')],
    ).enrichDraftComponents({
      allowIncomplete: false,
      includeConnections: false,
    })

    assert(result.kind === 'draftOnly')
    expect(result.components).toHaveLength(1)
  })
})
