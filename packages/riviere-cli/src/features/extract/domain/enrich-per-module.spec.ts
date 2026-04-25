import { Project } from 'ts-morph'
import type * as ExtractConfig from '@living-architecture/riviere-extract-config'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts'
import * as ExtractionProjectModule from './extraction-project'

const {
  mockExtractInto, mockMergeWritePort 
} = vi.hoisted(() => ({
  mockExtractInto: vi.fn(),
  mockMergeWritePort: vi.fn(() => ({ mocked: true })),
}))

vi.mock('@living-architecture/riviere-extract-ts', async () => {
  const actual = await vi.importActual<typeof import('@living-architecture/riviere-extract-ts')>(
    '@living-architecture/riviere-extract-ts',
  )

  return {
    ...actual,
    extractInto: mockExtractInto,
    mergeWritePort: mockMergeWritePort,
  }
})

function createModuleContext(): ExtractionProjectModule.ModuleContext {
  const module: ExtractConfig.Module = {
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

function createModuleContextWithDomain(domain: string): ExtractionProjectModule.ModuleContext {
  const moduleContext = createModuleContext()
  return {
    ...moduleContext,
    module: {
      ...moduleContext.module,
      domain,
    },
  }
}

function createConfig(
  moduleContext: ExtractionProjectModule.ModuleContext,
): ExtractConfig.ResolvedExtractionConfig {
  return { modules: [moduleContext.module] }
}

const matchAll = () => true

describe('ExtractionProject.enrichDraftComponents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes draft components to the shared extraction core', () => {
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
    const draftComponents: DraftComponent[] = [
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
    ]

    new ExtractionProjectModule.ExtractionProject(
      '/workspace',
      [moduleContext],
      resolvedConfig,
      'test/repo',
      draftComponents,
      matchAll,
    ).enrichDraftComponents({
      allowIncomplete: true,
      includeConnections: true,
    })

    expect(mockExtractInto).toHaveBeenCalledWith(
      expect.anything(),
      resolvedConfig,
      expect.objectContaining({
        allowIncomplete: true,
        configDir: '/workspace',
        draftComponents,
        includeConnections: true,
        mode: 'enrich',
        moduleContexts: [moduleContext],
        repository: 'test/repo',
      }),
    )
  })

  it('returns shared-core field failures unchanged', () => {
    mockExtractInto.mockReturnValueOnce({
      kind: 'fieldFailure',
      failedFields: ['operationName'],
    })

    const moduleContext = createModuleContext()
    const resolvedConfig = createConfig(moduleContext)
    const result = new ExtractionProjectModule.ExtractionProject(
      '/workspace',
      [moduleContext],
      resolvedConfig,
      'test/repo',
      [],
      matchAll,
    ).enrichDraftComponents({
      allowIncomplete: false,
      includeConnections: true,
    })

    expect(result).toStrictEqual({
      kind: 'fieldFailure',
      failedFields: ['operationName'],
    })
  })

  it('fills missing draft modules from the first available module when domains do not match', () => {
    mockExtractInto.mockReturnValueOnce({
      kind: 'draftOnly',
      components: [],
    })

    const moduleContext = createModuleContext()
    const resolvedConfig = createConfig(moduleContext)
    const draftComponents: DraftComponent[] = [
      {
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'billing',
        module: '',
        location: {
          file: '/workspace/orders/test.ts',
          line: 3,
        },
      },
    ]

    new ExtractionProjectModule.ExtractionProject(
      '/workspace',
      [moduleContext],
      resolvedConfig,
      'test/repo',
      draftComponents,
      matchAll,
    ).enrichDraftComponents({
      allowIncomplete: true,
      includeConnections: false,
    })

    expect(mockExtractInto).toHaveBeenCalledWith(
      expect.anything(),
      resolvedConfig,
      expect.objectContaining({
        draftComponents: [
          expect.objectContaining({
            domain: 'billing',
            module: 'orders-module',
          }),
        ],
      }),
    )
  })

  it('rejects missing draft modules when no module contexts can resolve them', () => {
    mockExtractInto.mockReturnValueOnce({
      kind: 'draftOnly',
      components: [],
    })

    const draftComponents: DraftComponent[] = [
      {
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'billing',
        module: '',
        location: {
          file: '/workspace/orders/test.ts',
          line: 3,
        },
      },
    ]

    expect(() =>
      new ExtractionProjectModule.ExtractionProject(
        '/workspace',
        [],
        { modules: [] },
        'test/repo',
        draftComponents,
        matchAll,
      ).enrichDraftComponents({
        allowIncomplete: true,
        includeConnections: false,
      }),
    ).toThrow("Unable to resolve module for draft component 'PlaceOrder'")
  })

  it('creates a fallback extracted domain when configured module domains are blank', () => {
    mockExtractInto.mockReturnValueOnce({
      kind: 'draftOnly',
      components: [],
    })

    const moduleContext = createModuleContextWithDomain('')

    new ExtractionProjectModule.ExtractionProject(
      '/workspace',
      [moduleContext],
      createConfig(moduleContext),
      'test/repo',
      [],
      matchAll,
    ).extractDraftComponents({
      allowIncomplete: true,
      includeConnections: false,
    })

    expect(mockExtractInto).toHaveBeenCalledWith(
      expect.anything(),
      createConfig(moduleContext),
      expect.objectContaining({
        includeConnections: false,
        mode: 'extract',
      }),
    )
  })

  it('supports workflow-style extraction through mergeWritePort', () => {
    mockExtractInto.mockReturnValueOnce({
      kind: 'draftOnly',
      components: [],
    })

    const moduleContext = createModuleContext()
    const resolvedConfig = createConfig(moduleContext)
    const workflowBuilder = {
      upsertUI: vi.fn(),
      upsertApi: vi.fn(),
      upsertUseCase: vi.fn(),
      upsertDomainOp: vi.fn(),
      upsertEvent: vi.fn(),
      upsertEventHandler: vi.fn(),
      upsertCustom: vi.fn(),
      link: vi.fn(),
      linkExternal: vi.fn(),
      defineCustomType: vi.fn(),
    }
    const diagnostics = { report: vi.fn() }

    new ExtractionProjectModule.ExtractionProject(
      '/workspace',
      [moduleContext],
      resolvedConfig,
      'test/repo',
      [],
      matchAll,
    ).extractIntoWorkflowBuilder(
      workflowBuilder,
      diagnostics,
      {
        step: 'extract-orders',
        stepType: 'code-extraction',
      },
      {
        allowIncomplete: true,
        includeConnections: true,
        mode: 'extract',
      },
    )

    expect(mockMergeWritePort).toHaveBeenCalledWith(workflowBuilder, diagnostics, {
      step: 'extract-orders',
      stepType: 'code-extraction',
    })
    expect(mockExtractInto).toHaveBeenCalledWith(
      { mocked: true },
      resolvedConfig,
      expect.objectContaining({
        mode: 'extract',
        includeConnections: true,
      }),
    )
  })
})
