import {
  describe, it, expect, vi, beforeEach 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EventsPage } from './EventsPage'
import type {
  RiviereGraph, SourceLocation 
} from '@/types/riviere'
import {
  parseNode, parseEdge, parseDomainMetadata 
} from '@/lib/riviereTestFixtures'

const testSourceLocation: SourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderWithRouter(graph: RiviereGraph, initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <EventsPage graph={graph} />
    </MemoryRouter>,
  )
}

describe('EventsPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('renders page header', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [],
      links: [],
    }

    renderWithRouter(graph)

    expect(screen.getByText('Events')).toBeInTheDocument()
    expect(screen.getByText(/Domain events and cross-domain event flows/i)).toBeInTheDocument()
  })

  it('displays stats bar with event counts', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'orders:event:order-placed',
          type: 'Event',
          name: 'OrderPlaced',
          domain: 'orders',
          module: 'checkout',
          eventName: 'OrderPlaced',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'orders:usecase:place-order',
          type: 'UseCase',
          name: 'PlaceOrderUseCase',
          domain: 'orders',
          module: 'checkout',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'inventory:handler:order-placed',
          type: 'EventHandler',
          name: 'OrderPlacedHandler',
          domain: 'inventory',
          module: 'fulfillment',
          subscribedEvents: ['OrderPlaced'],
        }),
      ],
      links: [
        parseEdge({
          source: 'orders:usecase:place-order',
          target: 'orders:event:order-placed',
          type: 'sync',
        }),
        parseEdge({
          source: 'orders:event:order-placed',
          target: 'inventory:handler:order-placed',
          type: 'async',
        }),
      ],
    }

    renderWithRouter(graph)

    expect(screen.getByText('Total Events')).toBeInTheDocument()
    expect(screen.getByTestId('stat-total-events')).toHaveTextContent('1')
    expect(screen.getByText('Publishers')).toBeInTheDocument()
    expect(screen.getByTestId('stat-publishers')).toHaveTextContent('1')
  })

  it('renders search input', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [],
      links: [],
    }

    renderWithRouter(graph)

    expect(screen.getByPlaceholderText('Search events...')).toBeInTheDocument()
  })

  it('renders domain filters when events exist', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'orders:event:order-placed',
          type: 'Event',
          name: 'OrderPlaced',
          domain: 'orders',
          module: 'checkout',
          eventName: 'OrderPlaced',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'payment:event:payment-completed',
          type: 'Event',
          name: 'PaymentCompleted',
          domain: 'payment',
          module: 'processing',
          eventName: 'PaymentCompleted',
        }),
      ],
      links: [],
    }

    renderWithRouter(graph)

    expect(screen.getByText('Domain:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'orders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'payment' })).toBeInTheDocument()
  })

  it('renders event cards for all events', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'orders:event:order-placed',
          type: 'Event',
          name: 'OrderPlaced',
          domain: 'orders',
          module: 'checkout',
          eventName: 'OrderPlaced',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'payment:event:payment-completed',
          type: 'Event',
          name: 'PaymentCompleted',
          domain: 'payment',
          module: 'processing',
          eventName: 'PaymentCompleted',
        }),
      ],
      links: [],
    }

    renderWithRouter(graph)

    expect(screen.getByText('OrderPlaced')).toBeInTheDocument()
    expect(screen.getByText('PaymentCompleted')).toBeInTheDocument()
  })

  it('filters events by search query', async () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'orders:event:order-placed',
          type: 'Event',
          name: 'OrderPlaced',
          domain: 'orders',
          module: 'checkout',
          eventName: 'OrderPlaced',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'payment:event:payment-completed',
          type: 'Event',
          name: 'PaymentCompleted',
          domain: 'payment',
          module: 'processing',
          eventName: 'PaymentCompleted',
        }),
      ],
      links: [],
    }

    render(
      <MemoryRouter>
        <EventsPage graph={graph} />
      </MemoryRouter>,
    )

    const searchInput = screen.getByPlaceholderText('Search events...')

    await userEvent.type(searchInput, 'order')

    expect(screen.getByText('OrderPlaced')).toBeInTheDocument()
    expect(screen.queryByText('PaymentCompleted')).not.toBeInTheDocument()
  })

  it('filters events by domain', async () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'orders:event:order-placed',
          type: 'Event',
          name: 'OrderPlaced',
          domain: 'orders',
          module: 'checkout',
          eventName: 'OrderPlaced',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'payment:event:payment-completed',
          type: 'Event',
          name: 'PaymentCompleted',
          domain: 'payment',
          module: 'processing',
          eventName: 'PaymentCompleted',
        }),
      ],
      links: [],
    }

    render(
      <MemoryRouter>
        <EventsPage graph={graph} />
      </MemoryRouter>,
    )

    const ordersButton = screen.getByRole('button', { name: 'orders' })
    await userEvent.click(ordersButton)

    expect(screen.getByText('OrderPlaced')).toBeInTheDocument()
    expect(screen.queryByText('PaymentCompleted')).not.toBeInTheDocument()
  })

  it('toggles domain filter off when clicked again', async () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'orders:event:order-placed',
          type: 'Event',
          name: 'OrderPlaced',
          domain: 'orders',
          module: 'checkout',
          eventName: 'OrderPlaced',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'payment:event:payment-completed',
          type: 'Event',
          name: 'PaymentCompleted',
          domain: 'payment',
          module: 'processing',
          eventName: 'PaymentCompleted',
        }),
      ],
      links: [],
    }

    render(
      <MemoryRouter>
        <EventsPage graph={graph} />
      </MemoryRouter>,
    )

    const ordersButton = screen.getByRole('button', { name: 'orders' })

    await userEvent.click(ordersButton)
    expect(screen.queryByText('PaymentCompleted')).not.toBeInTheDocument()

    await userEvent.click(ordersButton)
    expect(screen.getByText('PaymentCompleted')).toBeInTheDocument()
  })

  it('extracts event schema from eventSchema property', () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'orders:event:order-placed',
          type: 'Event',
          name: 'OrderPlaced',
          domain: 'orders',
          module: 'checkout',
          eventName: 'OrderPlaced',
          eventSchema: '{ orderId: string, total: number }',
        }),
      ],
      links: [],
    }

    render(
      <MemoryRouter>
        <EventsPage graph={graph} />
      </MemoryRouter>,
    )

    expect(screen.getByText('OrderPlaced')).toBeInTheDocument()
  })

  it('matches handlers to events using subscribedEvents property', async () => {
    const graph: RiviereGraph = {
      version: '1.0',
      metadata: {
        domains: parseDomainMetadata({
          'test-domain': {
            description: 'Test domain',
            systemType: 'domain',
          },
        }),
      },
      components: [
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'orders:event:order-placed',
          type: 'Event',
          name: 'OrderPlaced',
          domain: 'orders',
          module: 'checkout',
          eventName: 'OrderPlaced',
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'inventory:handler:order-placed',
          type: 'EventHandler',
          name: 'Reserve Inventory Handler',
          domain: 'inventory',
          module: 'fulfillment',
          subscribedEvents: ['OrderPlaced'],
        }),
        parseNode({
          sourceLocation: testSourceLocation,
          id: 'payment:handler:order-placed',
          type: 'EventHandler',
          name: 'Process Payment Handler',
          domain: 'payment',
          module: 'processing',
          subscribedEvents: ['OrderPlaced'],
        }),
      ],
      links: [],
    }

    renderWithRouter(graph)

    const eventAccordion = screen.getByRole('button', { name: /OrderPlaced/i })
    await userEvent.click(eventAccordion)

    expect(screen.getByText('Reserve Inventory Handler')).toBeInTheDocument()
    expect(screen.getByText('Process Payment Handler')).toBeInTheDocument()
  })

  describe('navigation', () => {
    it('preserves demo query param when navigating to full graph', async () => {
      const graph: RiviereGraph = {
        version: '1.0',
        metadata: {
          domains: parseDomainMetadata({
            'test-domain': {
              description: 'Test domain',
              systemType: 'domain',
            },
          }),
        },
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'orders:event:order-placed',
            type: 'Event',
            name: 'OrderPlaced',
            domain: 'orders',
            module: 'checkout',
            eventName: 'OrderPlaced',
          }),
        ],
        links: [],
      }

      renderWithRouter(graph, '/events?demo=true')

      const accordion = screen.getByRole('button', { name: /OrderPlaced/i })
      await userEvent.click(accordion)

      const viewOnGraphButton = screen.getByTitle('View on Graph')
      await userEvent.click(viewOnGraphButton)

      expect(mockNavigate).toHaveBeenCalledWith(
        '/full-graph?node=orders:event:order-placed&demo=true',
      )
    })

    it('navigates to handler on graph when clicking view handler button', async () => {
      const graph: RiviereGraph = {
        version: '1.0',
        metadata: {
          domains: parseDomainMetadata({
            'test-domain': {
              description: 'Test domain',
              systemType: 'domain',
            },
          }),
        },
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'orders:event:order-placed',
            type: 'Event',
            name: 'OrderPlaced',
            domain: 'orders',
            module: 'checkout',
            eventName: 'OrderPlaced',
          }),
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'inventory:handler:reserve-inventory',
            type: 'EventHandler',
            name: 'Reserve Inventory Handler',
            domain: 'inventory',
            module: 'fulfillment',
            subscribedEvents: ['OrderPlaced'],
          }),
        ],
        links: [],
      }

      renderWithRouter(graph)

      const accordion = screen.getByRole('button', { name: /OrderPlaced/i })
      await userEvent.click(accordion)

      const viewHandlerButtons = screen.getAllByTitle('View handler on graph')
      await userEvent.click(viewHandlerButtons[0])

      expect(mockNavigate).toHaveBeenCalledWith(
        '/full-graph?node=inventory:handler:reserve-inventory',
      )
    })
  })
})
