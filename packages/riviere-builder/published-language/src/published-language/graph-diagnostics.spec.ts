import type {
  Component,
  RiviereGraph,
} from '@living-architecture/riviere-schema-published-language/schema'
import { describe, expect, it } from 'vitest'
import { GraphDiagnostics } from './graph-diagnostics'

function component(id: string, domain = 'orders'): Component {
  return {
    id,
    name: id,
    domain,
    module: 'core',
    type: 'UseCase',
    sourceLocation: { repository: 'test/repo', filePath: 'src/test.ts' },
  }
}

function graph(input?: Partial<RiviereGraph>): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      domains: {
        orders: { description: 'Orders', systemType: 'domain' },
        shipping: { description: 'Shipping', systemType: 'domain' },
      },
    },
    components: [],
    links: [],
    ...input,
  }
}

describe('GraphDiagnostics', () => {
  it('returns no warnings when every component is connected and every domain is used', () => {
    const orders = component('orders:core:use-case:orders')
    const shipping = component('shipping:core:use-case:shipping', 'shipping')
    const diagnostics = GraphDiagnostics.fromGraph(
      graph({
        components: [orders, shipping],
        links: [{ source: orders.id, target: shipping.id }],
      }),
    )

    expect(diagnostics.warnings()).toStrictEqual([])
    expect(diagnostics.orphanComponents()).toStrictEqual([])
  })

  it('returns orphan components and warnings with the complete component values', () => {
    const orphan = component('orders:core:use-case:orphan')
    const diagnostics = GraphDiagnostics.fromGraph(graph({ components: [orphan] }))

    expect(diagnostics.orphanComponents()).toStrictEqual([orphan])
    expect(diagnostics.warnings()).toContainEqual({
      code: 'ORPHAN_COMPONENT',
      message: `Component '${orphan.id}' has no incoming or outgoing links`,
      componentId: orphan.id,
    })
  })

  it('does not classify either end of an internal link as an orphan', () => {
    const source = component('orders:core:use-case:source')
    const target = component('orders:core:use-case:target')
    const diagnostics = GraphDiagnostics.fromGraph(
      graph({
        components: [source, target],
        links: [{ source: source.id, target: target.id }],
      }),
    )

    expect(diagnostics.orphanComponents()).toStrictEqual([])
  })

  it('does not classify the source of an external link as an orphan', () => {
    const source = component('orders:core:use-case:source')
    const diagnostics = GraphDiagnostics.fromGraph(
      graph({
        components: [source],
        externalLinks: [{ source: source.id, target: { name: 'External' } }],
      }),
    )

    expect(diagnostics.orphanComponents()).toStrictEqual([])
  })

  it('reports every declared domain without components', () => {
    const diagnostics = GraphDiagnostics.fromGraph(
      graph({ components: [component('orders:core:use-case:orders')] }),
    )

    expect(diagnostics.warnings()).toContainEqual({
      code: 'UNUSED_DOMAIN',
      message: "Domain 'shipping' is declared but has no components",
      domainName: 'shipping',
    })
  })

  it('returns all orphan components', () => {
    const first = component('orders:core:use-case:first')
    const second = component('orders:core:use-case:second')

    expect(
      GraphDiagnostics.fromGraph(graph({ components: [first, second] })).orphanComponents(),
    ).toStrictEqual([first, second])
  })
})
