import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import { Project } from 'ts-morph'
import type { Module } from '@living-architecture/riviere-extract-config'
import {
  ExtractionProject, type ModuleContext 
} from './extraction-project'

const {
  mockExtractComponents,
  mockEnrichComponents,
  mockMatchesGlob,
  mockDeduplicateCrossStrategy,
  mockDetectCrossModule,
  mockDetectPerModule,
} = vi.hoisted(() => ({
  mockExtractComponents: vi.fn().mockReturnValue([]),
  mockEnrichComponents: vi.fn().mockReturnValue({
    components: [],
    failures: [],
  }),
  mockMatchesGlob: vi.fn(),
  mockDeduplicateCrossStrategy: vi.fn((links: { source: string }[]) => links),
  mockDetectPerModule: vi.fn().mockReturnValue({
    links: [
      {
        source: 'orders:useCase:OrderService',
        target: 'orders:repository:OrderRepo',
        type: 'sync',
      },
    ],
    timings: {
      callGraphMs: 1,
      configurableMs: 0,
      setupMs: 0,
    },
  }),
  mockDetectCrossModule: vi.fn().mockReturnValue({
    links: [],
    timings: { asyncDetectionMs: 0 },
  }),
}))

vi.mock('@living-architecture/riviere-extract-ts', () => ({
  extractComponents: mockExtractComponents,
  enrichComponents: mockEnrichComponents,
  matchesGlob: mockMatchesGlob,
  detectPerModuleConnections: mockDetectPerModule,
  detectCrossModuleConnections: mockDetectCrossModule,
  deduplicateCrossStrategy: mockDeduplicateCrossStrategy,
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
    files: [`/src/${moduleName}/test.ts`],
    module: createModule(moduleName),
    project: new Project(),
  }
}

describe('ExtractionProject.extractDraftComponents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns links when includeConnections is true', () => {
    const ctx = createModuleContext('orders')

    mockExtractComponents.mockReturnValue([
      {
        name: 'OrderService',
        domain: 'orders',
        type: 'useCase',
        location: {
          file: 'test.ts',
          line: 1,
        },
      },
    ])
    mockEnrichComponents.mockReturnValue({
      components: [
        {
          name: 'OrderService',
          domain: 'orders',
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
      timings: {
        callGraphMs: 1,
        configurableMs: 0,
        setupMs: 0,
      },
    })

    const project = new ExtractionProject('/config', [ctx], { modules: [] }, 'test-repo')
    const result = project.extractDraftComponents({
      allowIncomplete: true,
      includeConnections: true,
    })

    expect(result.kind).toBe('full')
  })

  it('returns no links when includeConnections is false', () => {
    const ctx = createModuleContext('orders')

    const project = new ExtractionProject('/config', [ctx], { modules: [] }, 'test-repo')
    const result = project.extractDraftComponents({
      allowIncomplete: true,
      includeConnections: false,
    })

    expect(result.kind).toBe('draftOnly')
  })
})
