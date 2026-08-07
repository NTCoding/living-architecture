import {
  // Keep expanded for ESLint.
  describe,
  expect,
  it,
} from 'vitest'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import { extractModules } from './extract-modules'

const graph: RiviereGraph = {
  version: '1.0',
  metadata: {
    domains: {
      warehouse: {
        description: 'Warehouse',
        systemType: 'other',
      },
      operations: {
        description: 'Operations',
        systemType: 'domain',
      },
    },
    customTypes: { Table: { description: 'Stored data' } },
  },
  components: [
    {
      id: 'table-2',
      type: 'Custom',
      customTypeName: 'Table',
      name: 'Orders',
      domain: 'warehouse',
      module: 'WarehouseStore',
      sourceLocation: { filePath: 'orders.sql' },
    },
    {
      id: 'table-1',
      type: 'Custom',
      customTypeName: 'Table',
      name: 'Configuration',
      domain: 'operations',
      module: 'ConfigurationStore',
      sourceLocation: { filePath: 'config.sql' },
    },
    {
      id: 'api-1',
      type: 'API',
      name: 'Order API',
      domain: 'operations',
      module: 'OrderProcessing',
      path: '/orders',
      sourceLocation: { filePath: 'api.ts' },
    },
    {
      id: 'use-case-1',
      type: 'UseCase',
      name: 'Load Order',
      domain: 'operations',
      module: 'OrderProcessing',
      sourceLocation: { filePath: 'load-order.ts' },
    },
  ],
  links: [],
}

describe('extractModules', () => {
  it('groups nodes by domain and module using their effective types', () => {
    expect(extractModules(graph)).toStrictEqual([
      {
        domain: 'operations',
        modules: [
          {
            name: 'ConfigurationStore',
            nodes: [
              {
                id: 'table-1',
                name: 'Configuration',
                type: 'Table',
                typeDescription: 'Stored data',
              },
            ],
          },
          {
            name: 'OrderProcessing',
            nodes: [
              {
                id: 'use-case-1',
                name: 'Load Order',
                type: 'UseCase',
                typeDescription: undefined,
              },
              {
                id: 'api-1',
                name: 'Order API',
                type: 'API',
                typeDescription: undefined,
              },
            ],
          },
        ],
      },
      {
        domain: 'warehouse',
        modules: [
          {
            name: 'WarehouseStore',
            nodes: [
              {
                id: 'table-2',
                name: 'Orders',
                type: 'Table',
                typeDescription: 'Stored data',
              },
            ],
          },
        ],
      },
    ])
  })
})
