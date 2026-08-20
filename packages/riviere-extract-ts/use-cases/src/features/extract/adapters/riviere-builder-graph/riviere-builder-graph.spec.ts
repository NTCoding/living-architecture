import { describe, expect, it, vi } from 'vitest'
import type { ExternalLink, RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { ExtractedLink } from '@living-architecture/riviere-extract-ts-domain-model/domain/connection-detection/extracted-link'
import { EnrichedComponent } from '@living-architecture/riviere-extract-ts-domain-model/domain/value-extraction/enriched-component'
import { createRiviereBuilderGraph, RiviereBuilderGraph } from './riviere-builder-graph'

const graph: RiviereGraph = {
  version: '1.0',
  metadata: { domains: {}, sources: [] },
  components: [],
  links: [],
  externalLinks: [],
}

function component(type: string, metadata: Record<string, string | string[]> = {}): EnrichedComponent {
  return EnrichedComponent.parse({
    type,
    name: `${type}Component`,
    domain: 'orders',
    module: 'orders',
    location: { file: 'src/orders.ts', line: 12 },
    metadata,
    _missing: undefined,
  })
}

function builder() {
  return {
    upsertApi: vi.fn<(input: unknown) => unknown>(),
    upsertCustom: vi.fn<(input: unknown) => unknown>(),
    upsertDomainOp: vi.fn<(input: unknown) => unknown>(),
    upsertEvent: vi.fn<(input: unknown) => unknown>(),
    upsertEventHandler: vi.fn<(input: unknown) => unknown>(),
    upsertUI: vi.fn<(input: unknown) => unknown>(),
    upsertUseCase: vi.fn<(input: unknown) => unknown>(),
    link: vi.fn<(input: unknown) => unknown>(),
    linkExternal: vi.fn<(input: unknown) => unknown>(),
    validate: vi.fn<() => unknown>(),
    build: vi.fn<() => RiviereGraph>(() => graph),
  }
}

describe('RiviereBuilderGraph', () => {
  it('maps every extracted component and preserves source repository information', () => {
    const operations = builder()
    const adapter = new RiviereBuilderGraph(operations)

    adapter.addComponents('shop', [
      component('api', { apiType: 'REST', method: 'POST', operationName: 'placeOrder', route: '/orders' }),
      component('useCase'),
      component('domainOp', { operationName: 'placeOrder' }),
      component('event', { eventName: 'OrderPlaced', eventSchema: 'OrderPlacedEvent' }),
      component('event', { eventName: 'OrderShipped' }),
      component('eventHandler', { subscribedEvents: ['OrderPlaced'] }),
      component('ui', { route: '/orders' }),
      component('eventSender'),
    ])

    expect({
      api: operations.upsertApi.mock.calls[0]?.[0],
      custom: operations.upsertCustom.mock.calls[0]?.[0],
      domainOp: operations.upsertDomainOp.mock.calls[0]?.[0],
      event: operations.upsertEvent.mock.calls[0]?.[0],
      eventHandler: operations.upsertEventHandler.mock.calls[0]?.[0],
      ui: operations.upsertUI.mock.calls[0]?.[0],
      useCaseCalls: operations.upsertUseCase.mock.calls.length,
    }).toMatchObject({
      api: {
        apiType: 'REST',
        httpMethod: 'POST',
        operationName: 'placeOrder',
        path: '/orders',
        sourceLocation: { repository: 'shop', filePath: 'src/orders.ts', lineNumber: 12 },
      },
      custom: { customTypeName: 'eventSender' },
      domainOp: { operationName: 'placeOrder' },
      event: { eventName: 'OrderPlaced', eventSchema: 'OrderPlacedEvent' },
      eventHandler: { subscribedEvents: ['OrderPlaced'] },
      ui: { route: '/orders' },
      useCaseCalls: 1,
    })
  })

  it('maps internal and external links, then delegates validation and graph building', () => {
    const operations = builder()
    const adapter = new RiviereBuilderGraph(operations)
    const link = ExtractedLink.parse({ source: 'orders:useCase:PlaceOrder', target: 'orders:event:OrderPlaced' })
    const externalLink: ExternalLink = {
      source: 'orders:api:Orders',
      target: { name: 'Payments', repository: 'payments' },
    }

    adapter.addLinks([link], [externalLink])
    adapter.validate()

    expect(operations.link).toHaveBeenCalledWith({
      from: link.source,
      to: link.target,
      type: link.type,
      sourceLocation: link.sourceLocation,
    })
    expect(operations.linkExternal).toHaveBeenCalledWith({
      from: externalLink.source,
      target: externalLink.target,
      type: externalLink.type,
      description: externalLink.description,
      sourceLocation: externalLink.sourceLocation,
    })
    expect(operations.validate).toHaveBeenCalledOnce()
    expect(adapter.build()).toBe(graph)
  })

  it('omits optional API fields that extraction did not supply', () => {
    const operations = builder()
    const adapter = new RiviereBuilderGraph(operations)

    adapter.addComponents('shop', [component('api', { apiType: 'REST' })])

    expect(operations.upsertApi).toHaveBeenCalledWith(
      expect.objectContaining({ apiType: 'REST' }),
    )
    expect(operations.upsertApi.mock.calls[0]?.[0]).not.toHaveProperty('httpMethod')
  })

  it.each([
    [component('api', { apiType: 'HTTP client' }), 'Extracted api component must contain a supported apiType'],
    [component('domainOp'), 'Extracted component must contain a string operationName'],
    [component('eventHandler'), 'Extracted component must contain string[] subscribedEvents'],
  ])('rejects graph fields that cannot satisfy the builder contract', (invalidComponent, message) => {
    const adapter = new RiviereBuilderGraph(builder())

    expect(() => adapter.addComponents('shop', [invalidComponent])).toThrow(message)
  })

  it('creates a fresh graph builder from the supplied builder factory', () => {
    const first = builder()
    const second = builder()
    const create = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second)
    const createGraphBuilder = createRiviereBuilderGraph({ create })
    const options = {
      domains: { orders: { description: 'Orders', systemType: 'domain' as const } },
      sources: [{ repository: 'shop' }],
    }

    expect(createGraphBuilder(options)).not.toBe(createGraphBuilder(options))
    expect(create).toHaveBeenCalledTimes(2)
    expect(create).toHaveBeenNthCalledWith(1, {
      domains: options.domains,
      sources: options.sources,
    })
  })
})
