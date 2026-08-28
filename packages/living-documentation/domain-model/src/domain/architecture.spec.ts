import { describe, expect, it } from 'vitest'
import { ArchitectureDiff, ArchitectureSource, extractArchitecture } from '../index'

describe('architecture', () => {
  it('extracts a canonical architecture from observed source', () => {
    const architecture = extractArchitecture(
      ArchitectureSource.from({
        subdomains: [
          {
            layers: {
              domain: {
                aggregates: [
                  {
                    entities: [
                      { name: 'Line', packageKind: 'domain-model', role: 'aggregate-entity' },
                      { name: 'Line', packageKind: 'domain-model', role: 'aggregate-entity' },
                    ],
                    methods: ['place', 'open', 'place'],
                    name: 'Order',
                    packageKind: 'domain-model',
                  },
                  {
                    entities: [
                      {
                        name: 'Shipment',
                        packageKind: 'domain-model',
                        role: 'aggregate-entity',
                      },
                    ],
                    methods: ['cancel', 'open'],
                    name: 'Order',
                    packageKind: 'domain-model',
                  },
                ],
                items: [
                  { name: 'OrderId', packageKind: 'domain-model', role: 'value-object' },
                  { name: 'OrderId', packageKind: 'domain-model', role: 'value-object' },
                ],
              },
              entrypoints: { aggregates: [], items: [] },
              'use-cases': {
                aggregates: [],
                items: [
                  {
                    externalClient: 'typescript',
                    name: 'Compiler',
                    packageKind: 'use-cases',
                    role: 'external-client-model',
                  },
                  {
                    name: 'Summary',
                    packageKind: 'use-cases',
                    relatedTo: [
                      { name: 'GenerateSummary', role: 'query-model-use-case' },
                      { name: 'AnotherSummary', role: 'query-model-use-case' },
                      { name: 'GenerateSummary', role: 'query-model-use-case' },
                    ],
                    role: 'query-model',
                  },
                  {
                    name: 'GenerateSummary',
                    packageKind: 'use-cases',
                    role: 'query-model-use-case',
                  },
                ],
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
              aggregates: [
                {
                  entities: [
                    { name: 'Line', packageKind: 'domain-model', role: 'aggregate-entity' },
                    { name: 'Shipment', packageKind: 'domain-model', role: 'aggregate-entity' },
                  ],
                  methods: ['cancel', 'open', 'place'],
                  name: 'Order',
                  packageKind: 'domain-model',
                },
              ],
              items: [{ name: 'OrderId', packageKind: 'domain-model', role: 'value-object' }],
            },
            entrypoints: { aggregates: [], items: [] },
            'use-cases': {
              aggregates: [],
              items: [
                {
                  externalClient: 'typescript',
                  name: 'Compiler',
                  packageKind: 'use-cases',
                  role: 'external-client-model',
                },
                {
                  name: 'GenerateSummary',
                  packageKind: 'use-cases',
                  role: 'query-model-use-case',
                },
                {
                  name: 'Summary',
                  packageKind: 'use-cases',
                  relatedTo: [
                    { name: 'AnotherSummary', role: 'query-model-use-case' },
                    { name: 'GenerateSummary', role: 'query-model-use-case' },
                  ],
                  role: 'query-model',
                },
              ],
            },
          },
          name: 'orders',
        },
      ],
    })
  })

  it('reports added and removed architecture by layer and subdomain', () => {
    const base = extractArchitecture(
      ArchitectureSource.from({
        subdomains: [
          {
            layers: {
              domain: {
                aggregates: [
                  {
                    entities: [],
                    methods: ['cancel', 'place'],
                    name: 'Order',
                    packageKind: 'domain-model',
                  },
                ],
                items: [{ name: 'OldPolicy', packageKind: 'domain-model', role: 'domain-service' }],
              },
              entrypoints: { aggregates: [], items: [] },
              'use-cases': {
                aggregates: [],
                items: [{ name: 'PlaceOrder', packageKind: 'use-cases', role: 'command-use-case' }],
              },
            },
            name: 'orders',
          },
          {
            layers: {
              domain: { aggregates: [], items: [] },
              entrypoints: { aggregates: [], items: [] },
              'use-cases': {
                aggregates: [],
                items: [{ name: 'ShipOrder', packageKind: 'use-cases', role: 'command-use-case' }],
              },
            },
            name: 'shipping',
          },
        ],
      }),
    )
    const head = extractArchitecture(
      ArchitectureSource.from({
        subdomains: [
          {
            layers: {
              domain: {
                aggregates: [
                  {
                    entities: [
                      { name: 'OrderLine', packageKind: 'domain-model', role: 'aggregate-entity' },
                    ],
                    methods: ['fulfil', 'place'],
                    name: 'Order',
                    packageKind: 'domain-model',
                  },
                  {
                    entities: [],
                    methods: ['start'],
                    name: 'NewOrder',
                    packageKind: 'domain-model',
                  },
                ],
                items: [{ name: 'NewPolicy', packageKind: 'domain-model', role: 'domain-service' }],
              },
              entrypoints: {
                aggregates: [],
                items: [
                  { name: 'createFulfil', packageKind: 'application', role: 'cli-entrypoint' },
                ],
              },
              'use-cases': {
                aggregates: [],
                items: [
                  { name: 'FulfilOrder', packageKind: 'use-cases', role: 'command-use-case' },
                ],
              },
            },
            name: 'orders',
          },
        ],
      }),
    )

    expect(ArchitectureDiff.fromArchitectures(base, head).changes()).toStrictEqual({
      subdomains: [
        {
          change: 'changed',
          layers: {
            domain: {
              added: {
                aggregates: [
                  {
                    entities: [],
                    methods: ['start'],
                    name: 'NewOrder',
                    packageKind: 'domain-model',
                  },
                  {
                    entities: [
                      { name: 'OrderLine', packageKind: 'domain-model', role: 'aggregate-entity' },
                    ],
                    methods: ['fulfil'],
                    name: 'Order',
                    packageKind: 'domain-model',
                  },
                ],
                items: [{ name: 'NewPolicy', packageKind: 'domain-model', role: 'domain-service' }],
              },
              removed: {
                aggregates: [
                  { entities: [], methods: ['cancel'], name: 'Order', packageKind: 'domain-model' },
                ],
                items: [{ name: 'OldPolicy', packageKind: 'domain-model', role: 'domain-service' }],
              },
            },
            entrypoints: {
              added: {
                aggregates: [],
                items: [
                  { name: 'createFulfil', packageKind: 'application', role: 'cli-entrypoint' },
                ],
              },
              removed: { aggregates: [], items: [] },
            },
            'use-cases': {
              added: {
                aggregates: [],
                items: [
                  { name: 'FulfilOrder', packageKind: 'use-cases', role: 'command-use-case' },
                ],
              },
              removed: {
                aggregates: [],
                items: [{ name: 'PlaceOrder', packageKind: 'use-cases', role: 'command-use-case' }],
              },
            },
          },
          name: 'orders',
        },
        {
          change: 'removed',
          layers: {
            domain: {
              added: { aggregates: [], items: [] },
              removed: { aggregates: [], items: [] },
            },
            entrypoints: {
              added: { aggregates: [], items: [] },
              removed: { aggregates: [], items: [] },
            },
            'use-cases': {
              added: { aggregates: [], items: [] },
              removed: {
                aggregates: [],
                items: [{ name: 'ShipOrder', packageKind: 'use-cases', role: 'command-use-case' }],
              },
            },
          },
          name: 'shipping',
        },
      ],
    })
  })

  it('omits subdomains without architecture changes', () => {
    const source = ArchitectureSource.from({ subdomains: [] })
    const architecture = extractArchitecture(source)

    expect(ArchitectureDiff.fromArchitectures(architecture, architecture).changes()).toStrictEqual({
      subdomains: [],
    })
  })

  it('compares added, removed, and unchanged subdomains and aggregates', () => {
    const stableLayer = {
      aggregates: [
        { entities: [], methods: ['keep'], name: 'Stable', packageKind: 'domain-model' },
      ],
      items: [
        { name: 'Alpha', packageKind: 'domain-model', role: 'domain-service' },
        { name: 'Alpha', packageKind: 'published-language', role: 'value-object' },
        { name: 'Beta', packageKind: 'domain-model', role: 'value-object' },
      ],
    } as const
    const base = extractArchitecture(
      ArchitectureSource.from({
        subdomains: [
          {
            layers: {
              domain: stableLayer,
              entrypoints: { aggregates: [], items: [] },
              'use-cases': { aggregates: [], items: [] },
            },
            name: 'stable',
          },
          {
            layers: {
              domain: {
                aggregates: [
                  { entities: [], methods: [], name: 'Removed', packageKind: 'domain-model' },
                ],
                items: [],
              },
              entrypoints: { aggregates: [], items: [] },
              'use-cases': { aggregates: [], items: [] },
            },
            name: 'removed',
          },
        ],
      }),
    )
    const head = extractArchitecture(
      ArchitectureSource.from({
        subdomains: [
          {
            layers: {
              domain: stableLayer,
              entrypoints: { aggregates: [], items: [] },
              'use-cases': { aggregates: [], items: [] },
            },
            name: 'stable',
          },
          {
            layers: {
              domain: {
                aggregates: [
                  { entities: [], methods: [], name: 'Added', packageKind: 'domain-model' },
                ],
                items: [],
              },
              entrypoints: { aggregates: [], items: [] },
              'use-cases': { aggregates: [], items: [] },
            },
            name: 'added',
          },
        ],
      }),
    )

    expect(
      ArchitectureDiff.fromArchitectures(base, head)
        .changes()
        .subdomains.map(({ change, name }) => ({ change, name })),
    ).toStrictEqual([
      { change: 'added', name: 'added' },
      { change: 'removed', name: 'removed' },
    ])
  })
})
