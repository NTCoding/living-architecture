import {
  describe, expect, it 
} from 'vitest'
import type { DraftComponent } from '@living-architecture/riviere-extract-ts'
import { formatDryRunOutput } from './extract-output-formatter'

describe('formatDryRunOutput', () => {
  it('groups and sorts draft components by domain and type', () => {
    const components: DraftComponent[] = [
      {
        type: 'useCase',
        name: 'Ship Order',
        domain: 'shipping',
        location: {
          file: 'b.ts',
          line: 1,
        },
      },
      {
        type: 'api',
        name: 'Create Order',
        domain: 'orders',
        location: {
          file: 'a.ts',
          line: 1,
        },
      },
      {
        type: 'api',
        name: 'Cancel Order',
        domain: 'orders',
        location: {
          file: 'a.ts',
          line: 2,
        },
      },
      {
        type: 'event',
        name: 'Order Shipped',
        domain: 'shipping',
        location: {
          file: 'b.ts',
          line: 2,
        },
      },
    ]

    expect(formatDryRunOutput(components)).toStrictEqual([
      'orders: api(2)',
      'shipping: event(1), useCase(1)',
    ])
  })
})
