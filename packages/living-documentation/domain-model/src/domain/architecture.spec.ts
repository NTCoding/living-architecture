import { describe, expect, it } from 'vitest'
import { ArchitectureSource, extractArchitecture } from '../index'

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
                    name: 'ClientModel',
                    packageKind: 'use-cases',
                    role: 'external-client-model',
                  },
                  {
                    externalClient: 'no-external-client',
                    name: 'ClientModel',
                    packageKind: 'use-cases',
                    role: 'external-client-model',
                  },
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
                  name: 'ClientModel',
                  packageKind: 'use-cases',
                  role: 'external-client-model',
                },
                {
                  externalClient: 'no-external-client',
                  name: 'ClientModel',
                  packageKind: 'use-cases',
                  role: 'external-client-model',
                },
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
})
