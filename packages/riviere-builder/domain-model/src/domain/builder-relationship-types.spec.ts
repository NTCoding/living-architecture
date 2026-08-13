import { describe, expect, it } from 'vitest'
import { RiviereBuilder } from './builder-facade'

function createValidOptions() {
  return {
    sources: [{ repository: 'test/repo' }],
    domains: {
      orders: {
        description: 'Order domain',
        systemType: 'domain',
      },
    },
  } as const
}

describe('RiviereBuilder relationship types', () => {
  it('stores a relationship type name and description', () => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.defineRelationshipType({
      name: 'executes',
      description: 'Invokes the target during execution',
    })

    const graph = builder.build()
    expect(graph.metadata.relationshipTypes?.['executes']?.description).toBe(
      'Invokes the target during execution',
    )
  })

  it('rejects a relationship type name that is already defined', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    const input = {
      name: 'executes',
      description: 'Invokes the target during execution',
    }
    builder.defineRelationshipType(input)

    expect(() => builder.defineRelationshipType(input)).toThrow(
      "Relationship type 'executes' already defined",
    )
  })

  it.each(['constructor', '__proto__'])('stores inherited name %s as its own type', (name) => {
    const builder = RiviereBuilder.new(createValidOptions())

    builder.defineRelationshipType({
      name,
      description: 'Project-defined relationship',
    })

    const relationshipTypes = builder.build().metadata.relationshipTypes
    expect(Object.hasOwn(relationshipTypes ?? {}, name)).toBe(true)
    expect(relationshipTypes?.[name]?.description).toBe('Project-defined relationship')
  })

  it('rejects an inherited relationship type name that is not declared', () => {
    const builder = RiviereBuilder.new(createValidOptions())
    const source = builder.addUseCase({
      name: 'Create Order',
      domain: 'orders',
      module: 'checkout',
      sourceLocation: {
        repository: 'test/repo',
        filePath: 'src/create-order.ts',
      },
    })

    expect(() =>
      builder.link({
        from: source.id,
        to: 'orders:checkout:usecase:confirm-order',
        relationshipType: 'constructor',
      }),
    ).toThrow("Relationship type 'constructor' not defined")
  })
})
