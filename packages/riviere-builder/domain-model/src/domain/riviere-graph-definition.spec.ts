import { RiviereGraphDefinition } from './riviere-graph-definition'

function definition() {
  return RiviereGraphDefinition.parse({
    name: 'Architecture',
    description: 'System architecture',
    generated: '2026-08-26',
    sources: [{ repository: 'test/repository', commit: 'abc123' }],
    domains: { orders: { description: 'Orders', systemType: 'domain' } },
    customTypes: {},
    relationshipTypes: {},
  })
}

describe('RiviereGraphDefinition', () => {
  it('preserves supplied graph definition values', () => {
    expect(definition().published()).toMatchObject({
      name: 'Architecture',
      description: 'System architecture',
      generated: '2026-08-26',
    })
  })

  it('supplies empty optional collections', () => {
    const value = RiviereGraphDefinition.parse({ domains: {} }).published()
    expect(value.sources).toStrictEqual([])
    expect(value.customTypes).toStrictEqual({})
    expect(value.relationshipTypes).toStrictEqual({})
  })

  it('adds a source, accepts an identical source, and rejects conflicting values', () => {
    const existing = definition()
    const added = existing.includingSource({ repository: 'second/repository' })
    expect(added.published().sources).toHaveLength(2)
    expect(existing.includingSource({ repository: 'test/repository', commit: 'abc123' })).toBe(
      existing,
    )
    expect(() =>
      definition().includingSource({ repository: 'test/repository', commit: 'changed' }),
    ).toThrow("Source 'test/repository' already exists with different values")
  })

  it('adds domains, accepts matching declarations, and rejects conflicting declarations', () => {
    const added = definition().includingDomain('shipping', {
      description: 'Shipping',
      systemType: 'domain',
    })
    expect(added.published().domains).toHaveProperty('shipping')
    const existing = definition()
    expect(
      existing.includingDomain('orders', {
        description: 'Orders',
        systemType: 'domain',
      }),
    ).toBe(existing)
    expect(() =>
      definition().includingDomain('orders', {
        description: 'Changed',
        systemType: 'domain',
      }),
    ).toThrow("Domain 'orders' already exists")
  })

  it('checks domains and required custom type properties', () => {
    const custom = definition().includingCustomType('Queue', {
      requiredProperties: { owner: { type: 'string' } },
    })
    expect(() => definition().ensureDomainExists('missing')).toThrow(
      "Domain 'missing' does not exist",
    )
    expect(() => definition().ensureCustomTypeAccepts('Missing', {})).toThrow(
      "Custom type 'Missing' not defined",
    )
    expect(() => custom.ensureCustomTypeAccepts('Queue', undefined)).toThrow(
      "Missing required properties for 'Queue': owner",
    )
    expect(() => custom.ensureCustomTypeAccepts('Queue', { owner: 'orders' })).not.toThrow()
  })

  it('rejects duplicate custom types', () => {
    expect(() =>
      definition().includingCustomType('Queue', {}).includingCustomType('Queue', {}),
    ).toThrow("Custom type 'Queue' already defined")
  })

  it('checks relationship type declarations', () => {
    const relationships = definition().includingRelationshipType('reads', {
      description: 'Reads from the target',
    })
    expect(() => relationships.ensureRelationshipTypeExists('reads')).not.toThrow()
    expect(() => relationships.ensureRelationshipTypeExists('writes')).toThrow(
      "Relationship type 'writes' not defined",
    )
    expect(() =>
      relationships.includingRelationshipType('reads', { description: 'Duplicate' }),
    ).toThrow("Relationship type 'reads' already defined")
  })
})
