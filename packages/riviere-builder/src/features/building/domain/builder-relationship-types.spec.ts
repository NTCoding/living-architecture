import {
  describe, expect, it 
} from 'vitest'
import {
  RiviereBuilder, type BuilderOptions 
} from './builder-facade'

function createValidOptions(): BuilderOptions {
  return {
    sources: [{ repository: 'test/repo' }],
    domains: {
      orders: {
        description: 'Order domain',
        systemType: 'domain',
      },
    },
  }
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
})
