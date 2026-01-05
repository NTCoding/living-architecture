import {
  describe, it, expect 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { DomainContextGraph } from './DomainContextGraph'
import type { AggregatedConnection } from '../../extractDomainDetails'

function createConnections(overrides: Partial<AggregatedConnection>[] = []): AggregatedConnection[] {
  const defaults: AggregatedConnection[] = [
    {
      targetDomain: 'inventory-domain',
      direction: 'outgoing',
      apiCount: 2,
      eventCount: 1 
    },
    {
      targetDomain: 'payment-domain',
      direction: 'outgoing',
      apiCount: 1,
      eventCount: 0 
    },
    {
      targetDomain: 'shipping-domain',
      direction: 'incoming',
      apiCount: 0,
      eventCount: 2 
    },
  ]
  if (overrides.length === 0) return defaults
  return overrides.map((o, i) => {
    const base = defaults[i % defaults.length]
    if (base === undefined) {
      throw new Error('Default connection not found')
    }
    return {
      ...base,
      ...o 
    }
  })
}

function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('DomainContextGraph', () => {
  describe('rendering', () => {
    it('renders current domain in center', () => {
      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={[]}
        />
      )

      expect(screen.getByText('order-domain')).toBeInTheDocument()
    })

    it('renders connected domains', () => {
      const connections = createConnections()

      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={connections}
        />
      )

      expect(screen.getByText('inventory-domain')).toBeInTheDocument()
      expect(screen.getByText('payment-domain')).toBeInTheDocument()
      expect(screen.getByText('shipping-domain')).toBeInTheDocument()
    })

    it('renders svg element', () => {
      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={[]}
        />
      )

      expect(document.querySelector('svg')).toBeInTheDocument()
    })

    it('highlights current domain differently from connected domains', () => {
      const connections = createConnections()

      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={connections}
        />
      )

      const currentDomainNode = screen.getByTestId('domain-node-order-domain')
      const connectedDomainNode = screen.getByTestId('domain-node-inventory-domain')

      expect(currentDomainNode).toHaveAttribute('data-current', 'true')
      expect(connectedDomainNode).toHaveAttribute('data-current', 'false')
    })
  })

  describe('edges', () => {
    it('renders edges between domains', () => {
      const connections = createConnections([
        {
          targetDomain: 'inventory-domain',
          direction: 'outgoing',
          apiCount: 1,
          eventCount: 0 
        },
      ])

      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={connections}
        />
      )

      expect(screen.getByTestId('edge-order-domain-inventory-domain')).toBeInTheDocument()
    })

    it('renders edge with correct direction for outgoing', () => {
      const connections = createConnections([
        {
          targetDomain: 'inventory-domain',
          direction: 'outgoing',
          apiCount: 1,
          eventCount: 0 
        },
      ])

      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={connections}
        />
      )

      const edge = screen.getByTestId('edge-order-domain-inventory-domain')
      expect(edge).toHaveAttribute('data-direction', 'outgoing')
    })

    it('renders edge with correct direction for incoming', () => {
      const connections = createConnections([
        {
          targetDomain: 'shipping-domain',
          direction: 'incoming',
          apiCount: 0,
          eventCount: 1 
        },
      ])

      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={connections}
        />
      )

      const edge = screen.getByTestId('edge-order-domain-shipping-domain')
      expect(edge).toHaveAttribute('data-direction', 'incoming')
    })
  })

  describe('tooltip interaction', () => {
    it('shows tooltip when connected domain is clicked', async () => {
      const user = userEvent.setup()
      const connections = createConnections([
        {
          targetDomain: 'inventory-domain',
          direction: 'outgoing',
          apiCount: 2,
          eventCount: 1 
        },
      ])

      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={connections}
        />
      )

      expect(screen.queryByTestId('tooltip-inventory-domain')).not.toBeInTheDocument()

      await user.click(screen.getByText('inventory-domain'))

      expect(screen.getByTestId('tooltip-inventory-domain')).toBeInTheDocument()
    })

    it('shows tooltip when current domain is clicked', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={[]}
        />
      )

      expect(screen.queryByTestId('tooltip-order-domain')).not.toBeInTheDocument()

      await user.click(screen.getByText('order-domain'))

      expect(screen.getByTestId('tooltip-order-domain')).toBeInTheDocument()
    })

    it('hides tooltip when clicking same domain again', async () => {
      const user = userEvent.setup()
      const connections = createConnections([
        {
          targetDomain: 'inventory-domain',
          direction: 'outgoing',
          apiCount: 1,
          eventCount: 0 
        },
      ])

      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={connections}
        />
      )

      await user.click(screen.getByTestId('domain-node-inventory-domain'))
      expect(screen.getByTestId('tooltip-inventory-domain')).toBeInTheDocument()

      await user.click(screen.getByTestId('domain-node-inventory-domain'))
      expect(screen.queryByTestId('tooltip-inventory-domain')).not.toBeInTheDocument()
    })

    it('shows connection info in tooltip for connected domain', async () => {
      const user = userEvent.setup()
      const connections = createConnections([
        {
          targetDomain: 'inventory-domain',
          direction: 'outgoing',
          apiCount: 2,
          eventCount: 1 
        },
      ])

      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={connections}
        />
      )

      await user.click(screen.getByText('inventory-domain'))

      const tooltip = screen.getByTestId('tooltip-inventory-domain')
      expect(tooltip).toHaveTextContent('inventory-domain')
      expect(tooltip).toHaveTextContent('2 API')
      expect(tooltip).toHaveTextContent('1 event')
    })
  })

  describe('empty state', () => {
    it('renders only current domain when no connections', () => {
      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={[]}
        />
      )

      expect(screen.getByText('order-domain')).toBeInTheDocument()
      expect(screen.queryByTestId(/edge-/)).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has accessible name for svg', () => {
      renderWithRouter(
        <DomainContextGraph
          domainId="order-domain"
          connections={[]}
        />
      )

      const svg = document.querySelector('svg')
      expect(svg).toHaveAttribute('aria-label', 'Domain context graph for order-domain')
    })
  })
})
