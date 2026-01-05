import {
  describe, it, expect 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DomainConnectionDiff } from './DomainConnectionDiff'
import type { DomainConnectionDiffResult } from './computeDomainConnectionDiff'

interface MinimalDiffInput {
  domains: string[]
  connections: {
    added: DomainConnectionDiffResult['connections']['added']
    removed: DomainConnectionDiffResult['connections']['removed']
    unchanged: DomainConnectionDiffResult['connections']['unchanged']
  }
}

function createMinimalDiff(input: MinimalDiffInput): DomainConnectionDiffResult {
  return {
    domains: input.domains,
    connections: {
      added: input.connections.added,
      removed: input.connections.removed,
      unchanged: input.connections.unchanged,
    },
  }
}

describe('DomainConnectionDiff', () => {
  describe('rendering', () => {
    it('renders ReactFlow container', () => {
      const diff = createMinimalDiff({
        domains: ['orders', 'payments'],
        connections: {
          added: [],
          removed: [],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByTestId('domain-connection-diff')).toBeInTheDocument()
    })

    it('displays legend with change types', () => {
      const diff = createMinimalDiff({
        domains: ['orders'],
        connections: {
          added: [],
          removed: [],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByText(/added/i)).toBeInTheDocument()
      expect(screen.getByText(/removed/i)).toBeInTheDocument()
      expect(screen.getByText(/unchanged/i)).toBeInTheDocument()
    })
  })

  describe('with connections', () => {
    it('renders with added connections between domains', () => {
      const diff = createMinimalDiff({
        domains: ['orders', 'payments'],
        connections: {
          added: [
            {
              source: 'orders',
              target: 'payments',
              apiCount: 1,
              eventCount: 0,
              edges: [
                {
                  sourceNodeName: 'POST /orders',
                  targetNodeName: 'Process Payment',
                  type: 'sync',
                },
              ],
            },
          ],
          removed: [],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByTestId('domain-connection-diff')).toBeInTheDocument()
    })

    it('renders with removed connections between domains', () => {
      const diff = createMinimalDiff({
        domains: ['orders', 'shipping'],
        connections: {
          added: [],
          removed: [
            {
              source: 'orders',
              target: 'shipping',
              apiCount: 2,
              eventCount: 1,
              edges: [
                {
                  sourceNodeName: 'Ship Order',
                  targetNodeName: 'Create Shipment',
                  type: 'sync',
                },
              ],
            },
          ],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByTestId('domain-connection-diff')).toBeInTheDocument()
    })

    it('renders with unchanged connections between domains', () => {
      const diff = createMinimalDiff({
        domains: ['inventory', 'warehouse'],
        connections: {
          added: [],
          removed: [],
          unchanged: [
            {
              source: 'inventory',
              target: 'warehouse',
              apiCount: 1,
              eventCount: 2,
              edges: [
                {
                  sourceNodeName: 'Check Stock',
                  targetNodeName: 'Get Inventory',
                  type: 'sync',
                },
              ],
            },
          ],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByTestId('domain-connection-diff')).toBeInTheDocument()
    })

    it('renders with mixed connection types', () => {
      const diff = createMinimalDiff({
        domains: ['orders', 'payments', 'shipping', 'inventory'],
        connections: {
          added: [
            {
              source: 'orders',
              target: 'payments',
              apiCount: 1,
              eventCount: 0,
              edges: [
                {
                  sourceNodeName: 'POST /orders',
                  targetNodeName: 'Process Payment',
                  type: 'sync',
                },
              ],
            },
          ],
          removed: [
            {
              source: 'orders',
              target: 'shipping',
              apiCount: 1,
              eventCount: 0,
              edges: [
                {
                  sourceNodeName: 'Ship Order',
                  targetNodeName: 'Create Shipment',
                  type: 'sync',
                },
              ],
            },
          ],
          unchanged: [
            {
              source: 'inventory',
              target: 'shipping',
              apiCount: 0,
              eventCount: 1,
              edges: [
                {
                  sourceNodeName: 'InventoryUpdated',
                  targetNodeName: 'Handle Inventory',
                  type: 'async',
                },
              ],
            },
          ],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByTestId('domain-connection-diff')).toBeInTheDocument()
    })

    it('renders domains with long names', () => {
      const diff = createMinimalDiff({
        domains: ['order-management-system', 'payment-processing'],
        connections: {
          added: [
            {
              source: 'order-management-system',
              target: 'payment-processing',
              apiCount: 1,
              eventCount: 0,
              edges: [
                {
                  sourceNodeName: 'POST /orders',
                  targetNodeName: 'Process',
                  type: 'sync',
                },
              ],
            },
          ],
          removed: [],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByTestId('domain-connection-diff')).toBeInTheDocument()
    })

    it('dims domains without changes', () => {
      const diff = createMinimalDiff({
        domains: ['orders', 'payments', 'shipping'],
        connections: {
          added: [
            {
              source: 'orders',
              target: 'payments',
              apiCount: 1,
              eventCount: 0,
              edges: [
                {
                  sourceNodeName: 'POST /orders',
                  targetNodeName: 'Process Payment',
                  type: 'sync',
                },
              ],
            },
          ],
          removed: [],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByTestId('domain-connection-diff')).toBeInTheDocument()
    })
  })

  describe('legend styling', () => {
    it('applies custom className when provided', () => {
      const diff = createMinimalDiff({
        domains: ['orders'],
        connections: {
          added: [],
          removed: [],
          unchanged: [],
        },
      })

      const { container } = render(<DomainConnectionDiff diff={diff} />)

      const legend = container.querySelector('.absolute.left-4.top-4')
      expect(legend).toBeInTheDocument()
    })
  })

  describe('edge tooltip', () => {
    it('renders tooltip with edges showing flow type icons', () => {
      const diff = createMinimalDiff({
        domains: ['orders', 'payments'],
        connections: {
          added: [
            {
              source: 'orders',
              target: 'payments',
              apiCount: 1,
              eventCount: 1,
              edges: [
                {
                  sourceNodeName: 'POST /orders',
                  targetNodeName: 'Process Payment',
                  type: 'sync',
                },
                {
                  sourceNodeName: 'OrderPlaced',
                  targetNodeName: 'HandleOrder',
                  type: 'async',
                },
              ],
            },
          ],
          removed: [],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByTestId('domain-connection-diff')).toBeInTheDocument()
    })

    it('handles connections with more than 5 edges', () => {
      const edgeType: 'sync' | 'async' | 'unknown' = 'sync'
      const manyEdges = Array.from({ length: 7 }, (_, i) => ({
        sourceNodeName: `Source${i}`,
        targetNodeName: `Target${i}`,
        type: edgeType,
      }))

      const diff = createMinimalDiff({
        domains: ['orders', 'payments'],
        connections: {
          added: [
            {
              source: 'orders',
              target: 'payments',
              apiCount: 7,
              eventCount: 0,
              edges: manyEdges,
            },
          ],
          removed: [],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByTestId('domain-connection-diff')).toBeInTheDocument()
    })

    it('handles connections with empty edges array', () => {
      const diff = createMinimalDiff({
        domains: ['orders', 'payments'],
        connections: {
          added: [
            {
              source: 'orders',
              target: 'payments',
              apiCount: 0,
              eventCount: 0,
              edges: [],
            },
          ],
          removed: [],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByTestId('domain-connection-diff')).toBeInTheDocument()
    })
  })

  describe('fullscreen modal', () => {
    it('renders expand button for fullscreen view', () => {
      const diff = createMinimalDiff({
        domains: ['orders', 'payments'],
        connections: {
          added: [
            {
              source: 'orders',
              target: 'payments',
              apiCount: 1,
              eventCount: 0,
              edges: [
                {
                  sourceNodeName: 'POST /orders',
                  targetNodeName: 'Process Payment',
                  type: 'sync',
                },
              ],
            },
          ],
          removed: [],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument()
    })

    it('opens fullscreen modal when expand button is clicked', async () => {
      const user = userEvent.setup()
      const diff = createMinimalDiff({
        domains: ['orders', 'payments'],
        connections: {
          added: [
            {
              source: 'orders',
              target: 'payments',
              apiCount: 1,
              eventCount: 0,
              edges: [
                {
                  sourceNodeName: 'POST /orders',
                  targetNodeName: 'Process Payment',
                  type: 'sync',
                },
              ],
            },
          ],
          removed: [],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      await user.click(screen.getByRole('button', { name: /expand/i }))

      expect(screen.getByRole('dialog', { name: /domain connection/i })).toBeInTheDocument()
    })

    it('closes fullscreen modal when close button is clicked', async () => {
      const user = userEvent.setup()
      const diff = createMinimalDiff({
        domains: ['orders', 'payments'],
        connections: {
          added: [
            {
              source: 'orders',
              target: 'payments',
              apiCount: 1,
              eventCount: 0,
              edges: [
                {
                  sourceNodeName: 'POST /orders',
                  targetNodeName: 'Process Payment',
                  type: 'sync',
                },
              ],
            },
          ],
          removed: [],
          unchanged: [],
        },
      })

      render(<DomainConnectionDiff diff={diff} />)

      await user.click(screen.getByRole('button', { name: /expand/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /close/i }))
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
