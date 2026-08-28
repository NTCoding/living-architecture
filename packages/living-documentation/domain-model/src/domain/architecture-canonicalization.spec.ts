import { describe, expect, it } from 'vitest'
import { ArchitectureSource, extractArchitecture } from '../index'

describe('architecture canonicalization', () => {
  it('merges duplicate subdomains without losing layer items', () => {
    const architecture = extractArchitecture(
      ArchitectureSource.from({
        subdomains: [
          {
            layers: {
              domain: {
                aggregates: [],
                items: [{ name: 'Order', packageKind: 'domain-model', role: 'aggregate' }],
              },
              entrypoints: { aggregates: [], items: [] },
              'use-cases': { aggregates: [], items: [] },
            },
            name: 'orders',
          },
          {
            layers: {
              domain: { aggregates: [], items: [] },
              entrypoints: {
                aggregates: [],
                items: [
                  { name: 'createOrder', packageKind: 'application', role: 'cli-entrypoint' },
                ],
              },
              'use-cases': {
                aggregates: [],
                items: [{ name: 'PlaceOrder', packageKind: 'use-cases', role: 'command-use-case' }],
              },
            },
            name: 'orders',
          },
        ],
      }),
    )

    expect(architecture.snapshot()).toStrictEqual({
      subdomains: [
        {
          layers: {
            domain: {
              aggregates: [],
              items: [{ name: 'Order', packageKind: 'domain-model', role: 'aggregate' }],
            },
            entrypoints: {
              aggregates: [],
              items: [{ name: 'createOrder', packageKind: 'application', role: 'cli-entrypoint' }],
            },
            'use-cases': {
              aggregates: [],
              items: [{ name: 'PlaceOrder', packageKind: 'use-cases', role: 'command-use-case' }],
            },
          },
          name: 'orders',
        },
      ],
    })
  })

  it('preserves distinct item and relationship tuples containing delimiters', () => {
    const architecture = extractArchitecture(
      ArchitectureSource.from({
        subdomains: [
          {
            layers: {
              domain: { aggregates: [], items: [] },
              entrypoints: { aggregates: [], items: [] },
              'use-cases': {
                aggregates: [],
                items: [
                  { name: 'c', packageKind: 'use-cases', role: 'a:b' },
                  { name: 'b:c', packageKind: 'use-cases', role: 'a' },
                  {
                    name: 'Related',
                    packageKind: 'use-cases',
                    relatedTo: [
                      { name: 'c', role: 'a:b' },
                      { name: 'b:c', role: 'a' },
                    ],
                    role: 'query-model',
                  },
                ],
              },
            },
            name: 'orders',
          },
        ],
      }),
    )

    expect(architecture.snapshot().subdomains[0]?.layers['use-cases'].items).toStrictEqual([
      { name: 'b:c', packageKind: 'use-cases', role: 'a' },
      { name: 'c', packageKind: 'use-cases', role: 'a:b' },
      {
        name: 'Related',
        packageKind: 'use-cases',
        relatedTo: [
          { name: 'c', role: 'a:b' },
          { name: 'b:c', role: 'a' },
        ],
        role: 'query-model',
      },
    ])
  })
})
