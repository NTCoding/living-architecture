import { assert, beforeEach, describe, expect, it, vi } from 'vitest'
import { Project } from 'ts-morph'
import { ValidatedConfiguration } from '@living-architecture/riviere-extract-config-published-language'
import { DraftComponent } from './component-extraction/draft-component'
import { ExtractComponentsForGraph } from './extract-components-for-graph'
import { ExtractionStage } from './extraction-stage'
import { OrphanedDraftComponentError } from './orphaned-draft-component-error'

const { mockExtractComponents, mockEnrichComponents } = vi.hoisted(() => ({
  mockExtractComponents: vi.fn(),
  mockEnrichComponents: vi.fn(),
}))

vi.mock('./component-extraction/extractor', () => ({
  extractComponents: mockExtractComponents,
}))

vi.mock('./value-extraction/enrich-components', () => ({
  enrichComponents: mockEnrichComponents,
}))

function createStage(
  moduleNames: string[] = ['orders'],
  modulesPattern: string | undefined = undefined,
): ExtractionStage {
  const result = ValidatedConfiguration.parse({
    modules: moduleNames.map((name) => ({
      name,
      domain: name,
      path: name,
      glob: '**/*.ts',
      ...(modulesPattern === undefined ? {} : { modules: modulesPattern }),
      api: { notUsed: true },
      useCase: { notUsed: true },
      domainOp: { notUsed: true },
      event: { notUsed: true },
      eventHandler: { notUsed: true },
      ui: { notUsed: true },
    })),
  })
  assert(result.success)
  const moduleContexts = result.data.modules.map((module) => ({
    module,
    files: [`${module.name}/order.ts`],
    project: new Project(),
  }))
  return ExtractionStage.parse({
    name: 'test',
    configPath: 'config.json',
    useTsConfig: false,
    repositoryName: 'shop',
    resolvedConfig: result.data,
    moduleContexts,
  })
}

function createDraft(module: string, name: string): DraftComponent {
  return DraftComponent.parse({
    domain: module,
    location: { file: `${module}/order.ts`, line: 1 },
    module,
    name,
    type: 'useCase',
  })
}

function createDraftInModule(domain: string, module: string, name: string): DraftComponent {
  return DraftComponent.parse({
    domain,
    location: { file: `${module}/order.ts`, line: 1 },
    module,
    name,
    type: 'useCase',
  })
}

describe('ExtractComponentsForGraph.execute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockExtractComponents.mockReturnValue([])
    mockEnrichComponents.mockReturnValue({ components: [], failures: [] })
  })

  it('returns enriched components without detecting connections', () => {
    const draft = createDraft('orders', 'PlaceOrder')
    const component = {
      domain: 'orders',
      location: { file: 'orders/order.ts', line: 1 },
      metadata: {},
      module: 'orders',
      name: 'PlaceOrder',
      type: 'useCase',
    }
    mockExtractComponents.mockReturnValue([draft, draft])
    mockEnrichComponents.mockReturnValue({ components: [component], failures: [] })

    const result = new ExtractComponentsForGraph().execute(createStage(), {
      allowIncomplete: false,
    })

    expect(result).toStrictEqual({
      ok: true,
      repository: 'shop',
      components: [component],
      failedFields: [],
    })
    expect(mockExtractComponents).toHaveBeenCalledWith(
      expect.any(Project),
      ['orders/order.ts'],
      expect.objectContaining({ name: 'orders' }),
    )
    expect(mockEnrichComponents).toHaveBeenCalledWith(
      [draft, draft],
      expect.objectContaining({ name: 'orders' }),
      expect.any(Project),
    )
  })

  it('returns strict field failure when enrichment misses required metadata', () => {
    mockExtractComponents.mockReturnValue([createDraft('orders', 'PlaceOrder')])
    mockEnrichComponents.mockReturnValue({
      components: [],
      failures: [{ field: 'operationName' }],
    })

    const result = new ExtractComponentsForGraph().execute(createStage(), {
      allowIncomplete: false,
    })

    expect(result).toStrictEqual({
      ok: false,
      failure: {
        reason: 'Field enrichment failed',
        failedFields: ['operationName'],
      },
    })
  })

  it('skips configured modules that produced no drafts', () => {
    const draft = createDraft('orders', 'PlaceOrder')
    mockExtractComponents.mockReturnValueOnce([draft])
    mockEnrichComponents.mockReturnValue({ components: [{ name: 'PlaceOrder' }], failures: [] })

    const result = new ExtractComponentsForGraph().execute(createStage(['orders', 'shipping']), {
      allowIncomplete: false,
    })

    expect(result).toStrictEqual({
      ok: true,
      repository: 'shop',
      components: [{ name: 'PlaceOrder' }],
      failedFields: [],
    })
    expect(mockEnrichComponents).toHaveBeenCalledTimes(1)
  })

  it('rejects drafts that reference an unknown module', () => {
    mockExtractComponents.mockReturnValue([createDraft('unknown', 'PlaceOrder')])

    expect(() =>
      new ExtractComponentsForGraph().execute(createStage(), { allowIncomplete: false }),
    ).toThrow(OrphanedDraftComponentError)
    expect(() =>
      new ExtractComponentsForGraph().execute(createStage(), { allowIncomplete: false }),
    ).toThrow('Draft components reference unknown modules: [unknown]. Known modules: [orders]')
  })

  it('enriches drafts against their configured modules', () => {
    const ordersDraft = createDraft('orders', 'PlaceOrder')
    const shippingDraft = createDraft('shipping', 'PrepareShipment')
    mockExtractComponents.mockReturnValueOnce([ordersDraft]).mockReturnValueOnce([shippingDraft])
    mockEnrichComponents
      .mockReturnValueOnce({ components: [{ name: 'PlaceOrder' }], failures: [{ field: 'route' }] })
      .mockReturnValueOnce({
        components: [{ name: 'PrepareShipment' }],
        failures: [{ field: 'route' }],
      })

    const result = new ExtractComponentsForGraph().execute(createStage(['orders', 'shipping']), {
      allowIncomplete: false,
    })

    expect(result).toStrictEqual({
      ok: false,
      failure: { reason: 'Field enrichment failed', failedFields: ['route'] },
    })
    expect(mockEnrichComponents).toHaveBeenNthCalledWith(
      1,
      [ordersDraft],
      expect.objectContaining({ name: 'orders' }),
      expect.any(Project),
    )
    expect(mockEnrichComponents).toHaveBeenNthCalledWith(
      2,
      [shippingDraft],
      expect.objectContaining({ name: 'shipping' }),
      expect.any(Project),
    )
  })

  it('enriches configured submodule drafts with their parent module rules', () => {
    const draft = createDraftInModule('orders', 'checkout', 'PlaceOrder')
    mockExtractComponents.mockReturnValue([draft])
    mockEnrichComponents.mockReturnValue({ components: [{ name: 'PlaceOrder' }], failures: [] })

    const result = new ExtractComponentsForGraph().execute(
      createStage(['orders'], 'src/{module}/'),
      { allowIncomplete: false },
    )

    expect(result).toStrictEqual({
      ok: true,
      repository: 'shop',
      components: [{ name: 'PlaceOrder' }],
      failedFields: [],
    })
    expect(mockEnrichComponents).toHaveBeenCalledWith(
      [draft],
      expect.objectContaining({ name: 'orders' }),
      expect.any(Project),
    )
  })
})
