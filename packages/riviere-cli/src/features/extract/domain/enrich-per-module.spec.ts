import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import type {
  Module,
  ResolvedExtractionConfig,
  ComponentRule,
} from '@living-architecture/riviere-extract-config'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts'

const {
  mockEnrichComponents, mockMatchesGlob 
} = vi.hoisted(() => ({
  mockEnrichComponents: vi.fn(),
  mockMatchesGlob: vi.fn(),
}))

vi.mock('@living-architecture/riviere-extract-ts', () => ({
  enrichComponents: mockEnrichComponents,
  matchesGlob: mockMatchesGlob,
}))

import {
  enrichPerModule, OrphanedDraftComponentError 
} from './enrich-per-module'
import type { ModuleContext } from './extract-draft-components'

const notUsedRule: ComponentRule = { notUsed: true }

function createModule(name: string): Module {
  return {
    name,
    path: name,
    glob: 'src/**',
    api: notUsedRule,
    useCase: notUsedRule,
    domainOp: notUsedRule,
    event: notUsedRule,
    eventHandler: notUsedRule,
    eventPublisher: notUsedRule,
    ui: notUsedRule,
  }
}

function createModuleContext(moduleName: string): ModuleContext {
  return {
    module: createModule(moduleName),
    files: [],
    project: Object.create(null),
  }
}

function createDraft(domain: string, name: string): DraftComponent {
  return {
    type: 'api',
    name,
    location: {
      file: 'test.ts',
      line: 1,
    },
    domain,
  }
}

const stubConfig: ResolvedExtractionConfig = { modules: [] }

describe('enrichPerModule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enriches drafts grouped by module', () => {
    mockEnrichComponents
      .mockReturnValueOnce({
        components: [
          {
            name: 'CompA',
            domain: 'orders',
          },
        ],
        failures: [],
      })
      .mockReturnValueOnce({
        components: [
          {
            name: 'CompB',
            domain: 'shipping',
          },
        ],
        failures: [],
      })

    const result = enrichPerModule(
      [createModuleContext('orders'), createModuleContext('shipping')],
      [createDraft('orders', 'CompA'), createDraft('shipping', 'CompB')],
      stubConfig,
      '/config',
    )

    expect(result.components).toHaveLength(2)
    expect(result.failedFields).toStrictEqual([])
    expect(mockEnrichComponents).toHaveBeenCalledTimes(2)
  })

  it('routes correct drafts to each module', () => {
    mockEnrichComponents
      .mockReturnValueOnce({
        components: [],
        failures: [],
      })
      .mockReturnValueOnce({
        components: [],
        failures: [],
      })

    enrichPerModule(
      [createModuleContext('orders'), createModuleContext('shipping')],
      [createDraft('orders', 'CompA'), createDraft('shipping', 'CompB')],
      stubConfig,
      '/config',
    )

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

    const result = enrichPerModule(
      [createModuleContext('orders'), createModuleContext('shipping')],
      [createDraft('orders', 'A'), createDraft('shipping', 'B')],
      stubConfig,
      '/config',
    )

    expect(result.failedFields).toStrictEqual(['name', 'type'])
  })

  it('skips modules with no matching drafts', () => {
    mockEnrichComponents.mockReturnValueOnce({
      components: [],
      failures: [],
    })

    const result = enrichPerModule(
      [createModuleContext('orders'), createModuleContext('empty')],
      [createDraft('orders', 'A')],
      stubConfig,
      '/config',
    )

    expect(mockEnrichComponents).toHaveBeenCalledTimes(1)
    expect(result.components).toStrictEqual([])
  })

  it('throws OrphanedDraftComponentError when drafts reference unknown modules', () => {
    expect(() =>
      enrichPerModule(
        [createModuleContext('orders')],
        [createDraft('orders', 'A'), createDraft('unknown-module', 'B')],
        stubConfig,
        '/config',
      ),
    ).toThrow(OrphanedDraftComponentError)
  })

  it('includes module names in orphan error message', () => {
    expect(() =>
      enrichPerModule(
        [createModuleContext('orders')],
        [createDraft('ghost', 'X')],
        stubConfig,
        '/config',
      ),
    ).toThrow('Draft components reference unknown modules: [ghost]. Known modules: [orders]')
  })

  it('returns empty result when no drafts provided', () => {
    const result = enrichPerModule([createModuleContext('orders')], [], stubConfig, '/config')

    expect(result.components).toStrictEqual([])
    expect(result.failedFields).toStrictEqual([])
    expect(mockEnrichComponents).not.toHaveBeenCalled()
  })
})
