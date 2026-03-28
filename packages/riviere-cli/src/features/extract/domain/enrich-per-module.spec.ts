import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import { Project } from 'ts-morph'
import type {
  ComponentRule,
  Module,
  ResolvedExtractionConfig,
} from '@living-architecture/riviere-extract-config'
import type {
  DraftComponent, ExtractedLink 
} from '@living-architecture/riviere-extract-ts'
import {
  ExtractionProject,
  OrphanedDraftComponentError,
  type ModuleContext,
} from './extraction-project'

const {
  mockEnrichComponents,
  mockMatchesGlob,
  mockDetectPerModuleConnections,
  mockDetectCrossModuleConnections,
  mockDeduplicateCrossStrategy,
} = vi.hoisted(() => ({
  mockEnrichComponents: vi.fn(),
  mockMatchesGlob: vi.fn(),
  mockDetectPerModuleConnections: vi.fn().mockReturnValue({
    links: [],
    timings: {
      callGraphMs: 0,
      configurableMs: 0,
      setupMs: 0,
    },
  }),
  mockDetectCrossModuleConnections: vi.fn().mockReturnValue({
    links: [],
    timings: { asyncDetectionMs: 0 },
  }),
  mockDeduplicateCrossStrategy: vi.fn((links: ExtractedLink[]): ExtractedLink[] => links),
}))

vi.mock('@living-architecture/riviere-extract-ts', () => ({
  enrichComponents: mockEnrichComponents,
  matchesGlob: mockMatchesGlob,
  detectPerModuleConnections: mockDetectPerModuleConnections,
  detectCrossModuleConnections: mockDetectCrossModuleConnections,
  deduplicateCrossStrategy: mockDeduplicateCrossStrategy,
}))

const notUsedRule: ComponentRule = { notUsed: true }

function createModule(name: string): Module {
  return {
    api: notUsedRule,
    domainOp: notUsedRule,
    event: notUsedRule,
    eventHandler: notUsedRule,
    eventPublisher: notUsedRule,
    glob: 'src/**',
    name,
    path: name,
    ui: notUsedRule,
    useCase: notUsedRule,
  }
}

function createModuleContext(moduleName: string): ModuleContext {
  return {
    files: [],
    module: createModule(moduleName),
    project: new Project(),
  }
}

function createDraft(domain: string, name: string): DraftComponent {
  return {
    domain,
    location: {
      file: 'test.ts',
      line: 1,
    },
    name,
    type: 'api',
  }
}

const stubConfig: ResolvedExtractionConfig = { modules: [] }

function createExtractionProject(
  moduleContexts: ModuleContext[],
  draftComponents: DraftComponent[] = [],
): ExtractionProject {
  return new ExtractionProject('/config', moduleContexts, stubConfig, 'test-repo', draftComponents)
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
      [createDraft('orders', 'CompA'), createDraft('shipping', 'CompB')],
    ).enrichDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

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

    expect(mockEnrichComponents).toHaveBeenNthCalledWith(
      1,
      [createDraft('orders', 'CompA')],
      stubConfig,
      expect.anything(),
      mockMatchesGlob,
      '/config',
    )
    expect(mockEnrichComponents).toHaveBeenNthCalledWith(
      2,
      [createDraft('shipping', 'CompB')],
      stubConfig,
      expect.anything(),
      mockMatchesGlob,
      '/config',
    )
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

  it('includes module names in orphan error message', () => {
    expect(() =>
      createExtractionProject(
        [createModuleContext('orders')],
        [createDraft('ghost', 'X')],
      ).enrichDraftComponents({
        allowIncomplete: false,
        includeConnections: true,
      }),
    ).toThrow('Draft components reference unknown modules: [ghost]. Known modules: [orders]')
  })

  it('returns empty result when no drafts provided', () => {
    const result = createExtractionProject(
      [createModuleContext('orders')],
      [],
    ).enrichDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

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

    expect(result.kind).toBe('draftOnly')
    expect(result.components).toHaveLength(1)
  })
})
