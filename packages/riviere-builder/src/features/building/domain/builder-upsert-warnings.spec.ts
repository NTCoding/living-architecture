import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  ComponentTypeMismatchError, RiviereBuilder, type BuilderOptions 
} from './index'

function createValidOptions(): BuilderOptions {
  return {
    sources: [
      {
        repository: 'test/repo',
        commit: 'abc123',
      },
    ],
    domains: {
      orders: {
        description: 'Order domain',
        systemType: 'domain',
      },
    },
  }
}

function sourceLocation() {
  return {
    repository: 'test/repo',
    filePath: 'src/test.ts',
  }
}

describe('RiviereBuilder upsert warnings', () => {
  it('emits SCALAR_OVERWRITE warning for changed scalar fields only', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.upsertUI({
      name: 'Checkout Page',
      domain: 'orders',
      module: 'checkout',
      route: '/checkout',
      description: 'first',
      sourceLocation: sourceLocation(),
    })

    builder.upsertUI({
      name: 'Checkout Page',
      domain: 'orders',
      module: 'checkout',
      route: '/checkout-v2',
      description: 'second',
      sourceLocation: sourceLocation(),
    })

    const overwriteWarnings = builder
      .warnings()
      .filter((warning) => warning.code === 'SCALAR_OVERWRITE')

    expect(overwriteWarnings).toHaveLength(2)
    expect(overwriteWarnings).toContainEqual({
      code: 'SCALAR_OVERWRITE',
      message: "Scalar field 'route' on component 'orders:checkout:ui:checkout-page' overwritten",
      componentId: 'orders:checkout:ui:checkout-page',
      field: 'route',
      oldValue: '/checkout',
      newValue: '/checkout-v2',
    })
    expect(overwriteWarnings).toContainEqual({
      code: 'SCALAR_OVERWRITE',
      message:
        "Scalar field 'description' on component 'orders:checkout:ui:checkout-page' overwritten",
      componentId: 'orders:checkout:ui:checkout-page',
      field: 'description',
      oldValue: 'first',
      newValue: 'second',
    })
  })

  it('does not emit SCALAR_OVERWRITE for unchanged value or noOverwrite skip', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.upsertUseCase({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      description: 'same',
      sourceLocation: sourceLocation(),
    })

    builder.upsertUseCase({
      name: 'Place Order',
      domain: 'orders',
      module: 'checkout',
      description: 'same',
      sourceLocation: sourceLocation(),
    })

    builder.upsertUseCase(
      {
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout',
        description: 'different',
        sourceLocation: sourceLocation(),
      },
      { noOverwrite: true },
    )

    expect(
      builder.warnings().filter((warning) => warning.code === 'SCALAR_OVERWRITE'),
    ).toHaveLength(0)
  })

  it('throws ComponentTypeMismatchError when existing component type differs for the same id', () => {
    const malformedGraph: RiviereGraph = {
      version: '1.0',
      metadata: {
        sources: [
          {
            repository: 'test/repo',
            commit: 'abc123',
          },
        ],
        domains: {
          orders: {
            description: 'Order domain',
            systemType: 'domain',
          },
        },
      },
      components: [
        {
          id: 'orders:checkout:ui:checkout-page',
          type: 'API',
          name: 'Checkout Page',
          domain: 'orders',
          module: 'checkout',
          apiType: 'REST',
          sourceLocation: sourceLocation(),
        },
      ],
      links: [],
    }

    const builder = RiviereBuilder.resume(malformedGraph)

    expect(() =>
      builder.upsertUI({
        name: 'Checkout Page',
        domain: 'orders',
        module: 'checkout',
        route: '/checkout',
        sourceLocation: sourceLocation(),
      }),
    ).toThrow(ComponentTypeMismatchError)

    expect(() =>
      builder.upsertUI({
        name: 'Checkout Page',
        domain: 'orders',
        module: 'checkout',
        route: '/checkout',
        sourceLocation: sourceLocation(),
      }),
    ).toThrow(
      "Component 'orders:checkout:ui:checkout-page' already exists as type 'API'; cannot upsert as 'UI'",
    )
  })

  it('throws ComponentTypeMismatchError with unknown existing type for malformed resumed graph', () => {
    const malformedGraph = JSON.parse(`{
      "version": "1.0",
      "metadata": {
        "sources": [{ "repository": "test/repo", "commit": "abc123" }],
        "domains": {
          "orders": {
            "description": "Order domain",
            "systemType": "domain"
          }
        }
      },
      "components": [
        {
          "id": "orders:checkout:ui:checkout-page",
          "name": "Checkout Page",
          "domain": "orders",
          "module": "checkout",
          "route": "/checkout",
          "sourceLocation": {
            "repository": "test/repo",
            "filePath": "src/test.ts"
          }
        }
      ],
      "links": []
    }`)

    const builder = RiviereBuilder.resume(malformedGraph)

    expect(() =>
      builder.upsertUI({
        name: 'Checkout Page',
        domain: 'orders',
        module: 'checkout',
        route: '/checkout-v2',
        sourceLocation: sourceLocation(),
      }),
    ).toThrow(
      "Component 'orders:checkout:ui:checkout-page' already exists as type 'unknown'; cannot upsert as 'UI'",
    )
  })
})
