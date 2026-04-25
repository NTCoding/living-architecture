import { Project } from 'ts-morph'
import type * as ExtractConfig from '@living-architecture/riviere-extract-config'
import type {
  DraftComponent, ExtractionWritePort 
} from '@living-architecture/riviere-extract-ts'
import * as ExtractionProjectModule from './extraction-project'

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

function createConfig(
  moduleContext: ExtractionProjectModule.ModuleContext,
): ExtractConfig.ResolvedExtractionConfig {
  return { modules: [moduleContext.module] }
}

const matchAll = () => true

describe('ExtractionProject builder-backed outcomes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds full enriched results from builder-backed writes during enrich mode', () => {
    mockExtractInto.mockImplementationOnce((writePort: ExtractionWritePort) => {
      writePort.addComponent({
        type: 'useCase',
        name: 'PlaceOrder',
        domain: 'orders',
        module: 'orders-module',
        sourceLocation: {
          repository: 'test/repo',
          filePath: '/workspace/orders/test.ts',
          lineNumber: 3,
        },
      })
      writePort.addComponent({
        type: 'useCase',
        name: 'ReserveInventory',
        domain: 'orders',
        module: 'orders-module',
        sourceLocation: {
          repository: 'test/repo',
          filePath: '/workspace/orders/test.ts',
          lineNumber: 8,
        },
      })
      writePort.addLink({
        from: 'orders:orders-module:usecase:placeorder',
        to: 'orders:orders-module:usecase:reserveinventory',
        type: 'sync',
      })
      writePort.addExternalLink({
        from: 'orders:orders-module:usecase:placeorder',
        target: { name: 'External Orders API' },
        type: 'sync',
      })

      return {
        kind: 'full',
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
            metadata: {},
          },
          {
            type: 'useCase',
            name: 'ReserveInventory',
            domain: 'orders',
            module: 'orders-module',
            location: {
              file: '/workspace/orders/test.ts',
              line: 8,
            },
            metadata: {},
          },
        ],
        failedFields: [],
        links: [
          {
            source: 'orders:orders-module:usecase:placeorder',
            target: 'orders:orders-module:usecase:reserveinventory',
            type: 'sync',
          },
        ],
        externalLinks: [
          {
            source: 'orders:orders-module:usecase:placeorder',
            target: { name: 'External Orders API' },
            type: 'sync',
          },
        ],
        timings: [],
      }
    })

    const moduleContext = createModuleContext()
    const resolvedConfig = createConfig(moduleContext)
    const result = new ExtractionProjectModule.ExtractionProject(
      '/workspace',
      [moduleContext],
      resolvedConfig,
      'test/repo',
      [
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
      matchAll,
    ).enrichDraftComponents({
      allowIncomplete: true,
      includeConnections: true,
    })

    expect(result).toMatchObject({
      kind: 'full',
      links: [
        {
          source: 'orders:orders-module:usecase:placeorder',
          target: 'orders:orders-module:usecase:reserveinventory',
          type: 'sync',
        },
      ],
      externalLinks: [
        {
          source: 'orders:orders-module:usecase:placeorder',
          target: { name: 'External Orders API' },
          type: 'sync',
        },
      ],
    })
  })

  it('resolves missing draft modules from module path matches when files were not preloaded', () => {
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
          file: '/workspace/orders/other-file.ts',
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
      expect.objectContaining({draftComponents: [expect.objectContaining({ module: 'orders-module' })],}),
    )
  })

  it('passes normalized draft components into workflow-style enrich mode', () => {
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
      [
        {
          type: 'useCase',
          name: 'PlaceOrder',
          domain: 'orders',
          module: '',
          location: {
            file: '/workspace/orders/test.ts',
            line: 3,
          },
        },
      ],
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
        mode: 'enrich',
      },
    )

    expect(mockExtractInto).toHaveBeenCalledWith(
      expect.anything(),
      resolvedConfig,
      expect.objectContaining({
        draftComponents: [expect.objectContaining({ module: 'orders-module' })],
        mode: 'enrich',
      }),
    )
  })

  it('throws when a draft file matches multiple loaded module source-file sets', () => {
    mockExtractInto.mockReturnValueOnce({
      kind: 'draftOnly',
      components: [],
    })

    const moduleContext = createModuleContext()
    const baseDuplicateModuleContext = createModuleContext()
    const duplicateModuleContext = {
      ...baseDuplicateModuleContext,
      module: {
        ...baseDuplicateModuleContext.module,
        name: 'orders-duplicate',
      },
      files: ['/workspace/orders/test.ts'],
    }

    expect(() =>
      new ExtractionProjectModule.ExtractionProject(
        '/workspace',
        [moduleContext, duplicateModuleContext],
        { modules: [moduleContext.module, duplicateModuleContext.module] },
        'test/repo',
        [
          {
            type: 'useCase',
            name: 'PlaceOrder',
            domain: 'orders',
            module: '',
            location: {
              file: '/workspace/orders/test.ts',
              line: 3,
            },
          },
        ],
        matchAll,
      ).enrichDraftComponents({
        allowIncomplete: true,
        includeConnections: false,
      }),
    ).toThrow(ExtractionProjectModule.AmbiguousDraftComponentModuleError)
  })

  it('throws when a draft file matches multiple module paths', () => {
    mockExtractInto.mockReturnValueOnce({
      kind: 'draftOnly',
      components: [],
    })

    const moduleContext = createModuleContext()
    const baseDuplicateModuleContext = createModuleContext()
    const duplicateModuleContext = {
      ...baseDuplicateModuleContext,
      module: {
        ...baseDuplicateModuleContext.module,
        name: 'orders-duplicate',
      },
      files: [],
    }

    expect(() =>
      new ExtractionProjectModule.ExtractionProject(
        '/workspace',
        [moduleContext, duplicateModuleContext],
        { modules: [moduleContext.module, duplicateModuleContext.module] },
        'test/repo',
        [
          {
            type: 'useCase',
            name: 'PlaceOrder',
            domain: 'orders',
            module: '',
            location: {
              file: '/workspace/orders/other-file.ts',
              line: 3,
            },
          },
        ],
        matchAll,
      ).enrichDraftComponents({
        allowIncomplete: true,
        includeConnections: false,
      }),
    ).toThrow(ExtractionProjectModule.AmbiguousDraftComponentModuleError)
  })
})
