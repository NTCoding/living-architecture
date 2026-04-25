import {
  describe, expect, it, vi 
} from 'vitest'
import { Project } from 'ts-morph'
import type {
  Module, ResolvedExtractionConfig 
} from '@living-architecture/riviere-extract-config'
import {
  ExtractionProject, type ModuleContext 
} from './extraction-project'

const { mockExtractInto } = vi.hoisted(() => ({ mockExtractInto: vi.fn() }))

vi.mock('@living-architecture/riviere-extract-ts', async () => {
  const actual = await vi.importActual<typeof import('@living-architecture/riviere-extract-ts')>(
    '@living-architecture/riviere-extract-ts',
  )

  return {
    ...actual,
    extractInto: mockExtractInto,
  }
})

function createModuleContext(): ModuleContext {
  const module: Module = {
    api: { notUsed: true },
    domain: 'orders',
    domainOp: { notUsed: true },
    event: { notUsed: true },
    eventHandler: { notUsed: true },
    glob: 'src/**',
    name: 'orders-module',
    path: 'orders',
    ui: { notUsed: true },
    useCase: { notUsed: true },
  }

  return {
    files: ['/workspace/orders/test.ts'],
    module,
    project: new Project(),
  }
}

function createConfig(moduleContext: ModuleContext): ResolvedExtractionConfig {
  return { modules: [moduleContext.module] }
}

const matchAll = () => true

describe('ExtractionProject.extractDraftComponents', () => {
  it('forwards options to extractInto when a full outcome is returned', () => {
    mockExtractInto.mockReturnValueOnce({
      kind: 'full',
      components: [],
      failedFields: [],
      links: [],
      externalLinks: [],
      timings: [],
    })

    const moduleContext = createModuleContext()
    const resolvedConfig = createConfig(moduleContext)
    const result = new ExtractionProject(
      '/workspace',
      [moduleContext],
      resolvedConfig,
      'test/repo',
      [],
      matchAll,
    ).extractDraftComponents({
      allowIncomplete: true,
      includeConnections: true,
    })

    expect(result.kind).toBe('full')
    expect(mockExtractInto).toHaveBeenCalledWith(
      expect.anything(),
      resolvedConfig,
      expect.objectContaining({
        allowIncomplete: true,
        configDir: '/workspace',
        includeConnections: true,
        mode: 'extract',
        moduleContexts: [moduleContext],
        repository: 'test/repo',
      }),
    )
  })

  it('returns the shared-core draft result object unchanged', () => {
    mockExtractInto.mockReturnValueOnce({
      kind: 'draftOnly',
      components: [
        {
          type: 'useCase',
          name: 'PlaceOrder',
          domain: 'orders',
          module: 'orders-module',
          location: {
            file: '/workspace/orders/test.ts',
            line: 3,
          },
        },
      ],
    })

    const moduleContext = createModuleContext()
    const resolvedConfig = createConfig(moduleContext)
    const result = new ExtractionProject(
      '/workspace',
      [moduleContext],
      resolvedConfig,
      'test/repo',
      [],
      matchAll,
    ).extractDraftComponents({
      allowIncomplete: false,
      includeConnections: false,
    })

    expect(result).toStrictEqual({
      kind: 'draftOnly',
      components: [
        {
          type: 'useCase',
          name: 'PlaceOrder',
          domain: 'orders',
          module: 'orders-module',
          location: {
            file: '/workspace/orders/test.ts',
            line: 3,
          },
        },
      ],
    })
  })
})
