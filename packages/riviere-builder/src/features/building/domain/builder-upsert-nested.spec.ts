import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  RiviereBuilder, type BuilderOptions 
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

describe('RiviereBuilder upsert nested merge behavior', () => {
  it('recursively merges nested custom metadata objects and arrays', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    builder.defineCustomType({ name: 'Queue' })

    builder.upsertCustom({
      customTypeName: 'Queue',
      name: 'Outbox Queue',
      domain: 'orders',
      module: 'infra',
      sourceLocation: sourceLocation(),
      metadata: {
        settings: {
          limits: { maxRetries: 3 },
          tags: ['critical'],
        },
      },
    })

    const merged = builder.upsertCustom({
      customTypeName: 'Queue',
      name: 'Outbox Queue',
      domain: 'orders',
      module: 'infra',
      sourceLocation: sourceLocation(),
      metadata: {
        settings: {
          limits: { timeoutMs: 1000 },
          tags: ['internal', 'critical'],
        },
      },
    })

    expect(merged.component['settings']).toStrictEqual({
      limits: {
        maxRetries: 3,
        timeoutMs: 1000,
      },
      tags: ['critical', 'internal'],
    })
  })

  it('preserves nested custom metadata scalars with noOverwrite', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    builder.defineCustomType({ name: 'Queue' })

    builder.upsertCustom({
      customTypeName: 'Queue',
      name: 'Outbox Queue',
      domain: 'orders',
      module: 'infra',
      sourceLocation: sourceLocation(),
      metadata: { settings: { limits: { maxRetries: 3 } } },
    })

    const merged = builder.upsertCustom(
      {
        customTypeName: 'Queue',
        name: 'Outbox Queue',
        domain: 'orders',
        module: 'infra',
        sourceLocation: sourceLocation(),
        metadata: { settings: { limits: { maxRetries: 10 } } },
      },
      { noOverwrite: true },
    )

    expect(merged.component['settings']).toStrictEqual({ limits: { maxRetries: 3 } })
  })

  it('treats nested null metadata values as no-op during merge', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    builder.defineCustomType({ name: 'Queue' })

    builder.upsertCustom({
      customTypeName: 'Queue',
      name: 'Outbox Queue',
      domain: 'orders',
      module: 'infra',
      sourceLocation: sourceLocation(),
      metadata: { settings: { limits: { maxRetries: 3 } } },
    })

    const merged = builder.upsertCustom(
      JSON.parse(`{
      "customTypeName": "Queue",
      "name": "Outbox Queue",
      "domain": "orders",
      "module": "infra",
      "sourceLocation": {
        "repository": "test/repo",
        "filePath": "src/test.ts"
      },
      "metadata": {
        "settings": {
          "limits": {
            "maxRetries": null,
            "timeoutMs": 1000
          }
        }
      }
    }`),
    )

    expect(merged.component['settings']).toStrictEqual({
      limits: {
        maxRetries: 3,
        timeoutMs: 1000,
      },
    })
  })

  it('handles non-record DomainOp behavior from resumed malformed graph', () => {
    const malformedGraph: RiviereGraph = JSON.parse(`{
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
          "id": "orders:domain:domainop:place-order",
          "type": "DomainOp",
          "name": "Place Order",
          "domain": "orders",
          "module": "domain",
          "operationName": "placeOrder",
          "behavior": ["invalid-shape"],
          "sourceLocation": {
            "repository": "test/repo",
            "filePath": "src/test.ts"
          }
        }
      ],
      "links": []
    }`)

    const builder = RiviereBuilder.resume(malformedGraph)

    const merged = builder.upsertDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'domain',
      operationName: 'placeOrder',
      behavior: { reads: ['inventory'] },
      sourceLocation: sourceLocation(),
    })

    expect(merged.component.behavior).toStrictEqual({ reads: ['inventory'] })
  })

  it('handles DomainOp behavior records without reads array', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.upsertDomainOp({
      name: 'Place Order',
      domain: 'orders',
      module: 'domain',
      operationName: 'placeOrder',
      behavior: { reads: ['inventory'] },
      sourceLocation: sourceLocation(),
    })

    const merged = builder.upsertDomainOp(
      JSON.parse(`{
      "name": "Place Order",
      "domain": "orders",
      "module": "domain",
      "operationName": "placeOrder",
      "behavior": {
        "validates": ["payment"],
        "modifies": ["orders"]
      },
      "sourceLocation": {
        "repository": "test/repo",
        "filePath": "src/test.ts"
      }
    }`),
    )

    expect(merged.component.behavior).toStrictEqual({
      reads: ['inventory'],
      validates: ['payment'],
      modifies: ['orders'],
    })
  })

  it('merges nested object into previously undefined custom metadata field', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    builder.defineCustomType({ name: 'Queue' })

    builder.upsertCustom({
      customTypeName: 'Queue',
      name: 'Outbox Queue',
      domain: 'orders',
      module: 'infra',
      sourceLocation: sourceLocation(),
      metadata: { owner: 'team-a' },
    })

    const merged = builder.upsertCustom({
      customTypeName: 'Queue',
      name: 'Outbox Queue',
      domain: 'orders',
      module: 'infra',
      sourceLocation: sourceLocation(),
      metadata: { settings: { retries: { max: 3 } } },
    })

    expect(merged.component['settings']).toStrictEqual({ retries: { max: 3 } })
  })

  it('replaces primitive custom metadata field with object and merges recursively', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    builder.defineCustomType({ name: 'Queue' })

    builder.upsertCustom({
      customTypeName: 'Queue',
      name: 'Outbox Queue',
      domain: 'orders',
      module: 'infra',
      sourceLocation: sourceLocation(),
      metadata: { settings: 'legacy-settings' },
    })

    const merged = builder.upsertCustom({
      customTypeName: 'Queue',
      name: 'Outbox Queue',
      domain: 'orders',
      module: 'infra',
      sourceLocation: sourceLocation(),
      metadata: { settings: { retries: { max: 5 } } },
    })

    expect(merged.component['settings']).toStrictEqual({ retries: { max: 5 } })
  })
})
