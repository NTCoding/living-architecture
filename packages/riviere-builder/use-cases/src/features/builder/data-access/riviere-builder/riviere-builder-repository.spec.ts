import { describe, expect, it } from 'vitest'
import { RiviereBuilderRepository } from './riviere-builder-repository'

describe('RiviereBuilderRepository', () => {
  it('creates a fresh in-memory builder from graph options', () => {
    const repository = new RiviereBuilderRepository()
    const first = repository.create({
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
      sources: [{ repository: 'https://github.com/example/orders' }],
    })
    const second = repository.create({
      domains: { orders: { description: 'Orders', systemType: 'domain' } },
      sources: [{ repository: 'https://github.com/example/orders' }],
    })

    expect(first).not.toBe(second)
    expect(first.build()).toMatchObject({
      metadata: {
        domains: { orders: { description: 'Orders', systemType: 'domain' } },
        sources: [{ repository: 'https://github.com/example/orders' }],
      },
    })
  })
})
