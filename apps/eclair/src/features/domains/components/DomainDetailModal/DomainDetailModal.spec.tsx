import {
  describe, it, expect, vi
} from 'vitest'
import {
  render, screen
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { DomainDetailModal } from './DomainDetailModal'
import type { DomainDetails } from '../../extractDomainDetails'
import {
  operationNameSchema,
  entryPointSchema,
  type OperationName,
  type EntryPoint,
} from '@/platform/domain/eclair-types'
import { assertDefined } from '@/test-assertions'

const parseOperation = (s: string): OperationName => operationNameSchema.parse(s)
const parseEntryPoint = (s: string): EntryPoint => entryPointSchema.parse(s)

function createDomainDetails(overrides: Partial<DomainDetails> = {}): DomainDetails {
  return {
    id: 'order-domain',
    description: 'Manages order lifecycle',
    systemType: 'domain',
    nodeBreakdown: {
      UI: 0,
      API: 2,
      UseCase: 1,
      DomainOp: 3,
      Event: 1,
      EventHandler: 0,
      Custom: 0,
    },
    nodes: [
      {
        id: 'api-1',
        type: 'API',
        name: 'POST /orders',
        location: 'src/api/orders.ts:12',
        sourceLocation: undefined,
      },
      {
        id: 'uc-1',
        type: 'UseCase',
        name: 'PlaceOrder',
        location: 'src/usecases/PlaceOrder.ts:8',
        sourceLocation: undefined,
      },
    ],
    entities: [
      {
        name: 'Order',
        operations: [parseOperation('begin'), parseOperation('confirm'), parseOperation('cancel')],
        operationDetails: [],
        allStates: [],
        invariants: [],
        description: undefined,
        sourceLocation: undefined,
      },
      {
        name: 'OrderItem',
        operations: [parseOperation('add'), parseOperation('remove')],
        operationDetails: [],
        allStates: [],
        invariants: [],
        description: undefined,
        sourceLocation: undefined,
      },
    ],
    aggregatedConnections: [],
    events: {
      published: [
        {
          id: 'evt-1',
          eventName: 'OrderPlaced',
          schema: undefined,
          sourceLocation: undefined,
          handlers: [],
        },
        {
          id: 'evt-2',
          eventName: 'OrderConfirmed',
          schema: undefined,
          sourceLocation: undefined,
          handlers: [],
        },
      ],
      consumed: [
        {
          id: 'h-1',
          handlerName: 'PaymentCompleted',
          description: undefined,
          subscribedEvents: ['PaymentCompleted'],
          subscribedEventsWithDomain: [
            {
              eventName: 'PaymentCompleted',
              sourceKnown: false,
            },
          ],
          sourceLocation: undefined,
        },
        {
          id: 'h-2',
          handlerName: 'InventoryReserved',
          description: undefined,
          subscribedEvents: ['InventoryReserved'],
          subscribedEventsWithDomain: [
            {
              eventName: 'InventoryReserved',
              sourceKnown: false,
            },
          ],
          sourceLocation: undefined,
        },
      ],
    },
    crossDomainEdges: [
      {
        targetDomain: 'inventory-domain',
        edgeType: 'async',
      },
      {
        targetDomain: 'payment-domain',
        edgeType: 'async',
      },
    ],
    entryPoints: [parseEntryPoint('/orders'), parseEntryPoint('/orders/:id')],
    repository: 'ecommerce-app',
    ...overrides,
  }
}

function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('DomainDetailModal', () => {
  describe('when not open', () => {
    it('renders nothing', () => {
      const { container } = renderWithRouter(<DomainDetailModal domain={null} onClose={vi.fn()} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('when open', () => {
    describe('header', () => {
      it('renders domain id as title', () => {
        const domain = createDomainDetails({ id: 'unique-domain-title' })

        renderWithRouter(<DomainDetailModal domain={domain} onClose={vi.fn()} />)

        expect(screen.getByRole('heading', { name: 'unique-domain-title' })).toBeInTheDocument()
      })

      it('renders close button', () => {
        renderWithRouter(<DomainDetailModal domain={createDomainDetails()} onClose={vi.fn()} />)

        expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
      })

      it('calls onClose when close button clicked', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()

        renderWithRouter(<DomainDetailModal domain={createDomainDetails()} onClose={onClose} />)

        await user.click(screen.getByRole('button', { name: 'Close' }))

        expect(onClose).toHaveBeenCalledWith(expect.anything())
      })
    })

    describe('description section', () => {
      it('renders description', () => {
        const domain = createDomainDetails({ description: 'Handles all order operations' })

        renderWithRouter(<DomainDetailModal domain={domain} onClose={vi.fn()} />)

        expect(screen.getByText('Handles all order operations')).toBeInTheDocument()
      })
    })

    describe('nodes section', () => {
      it('renders all nodes with type badge and name', () => {
        const domain = createDomainDetails({
          nodes: [
            {
              id: 'api-1',
              type: 'API',
              name: 'POST /orders',
              location: 'src/api.ts:10',
              sourceLocation: undefined,
            },
            {
              id: 'uc-1',
              type: 'UseCase',
              name: 'PlaceOrder',
              location: 'src/uc.ts:5',
              sourceLocation: undefined,
            },
          ],
        })

        renderWithRouter(<DomainDetailModal domain={domain} onClose={vi.fn()} />)

        expect(screen.getByText('Nodes')).toBeInTheDocument()
        expect(screen.getByText('POST /orders')).toBeInTheDocument()
        expect(screen.getByText('PlaceOrder')).toBeInTheDocument()
      })

      it('renders code location links', () => {
        const domain = createDomainDetails({
          nodes: [
            {
              id: 'api-1',
              type: 'API',
              name: 'POST /orders',
              location: 'src/api/orders.ts:12',
              sourceLocation: undefined,
            },
          ],
        })

        renderWithRouter(<DomainDetailModal domain={domain} onClose={vi.fn()} />)

        expect(screen.getByText('src/api/orders.ts:12')).toBeInTheDocument()
      })

      it('handles nodes without location', () => {
        const domain = createDomainDetails({
          nodes: [
            {
              id: 'api-1',
              type: 'API',
              name: 'POST /orders',
              location: undefined,
              sourceLocation: undefined,
            },
          ],
        })

        renderWithRouter(<DomainDetailModal domain={domain} onClose={vi.fn()} />)

        expect(screen.getByText('POST /orders')).toBeInTheDocument()
      })

      it('renders empty state when no nodes', () => {
        const domain = createDomainDetails({ nodes: [] })

        renderWithRouter(<DomainDetailModal domain={domain} onClose={vi.fn()} />)

        expect(screen.getByText('No nodes in this domain')).toBeInTheDocument()
      })
    })

    describe('entities section', () => {
      function createDomainWithEntities(): DomainDetails {
        return createDomainDetails({
          entities: [
            {
              name: 'Order',
              operations: [parseOperation('begin'), parseOperation('confirm')],
              operationDetails: [],
              allStates: [],
              invariants: [],
              description: undefined,
              sourceLocation: undefined,
            },
            {
              name: 'Payment',
              operations: [parseOperation('authorize')],
              operationDetails: [],
              allStates: [],
              invariants: [],
              description: undefined,
              sourceLocation: undefined,
            },
          ],
        })
      }

      it.each([
        'Entities',
        'Order',
        'begin',
        'confirm',
        'Payment',
        'authorize',
      ])('renders %s in entities section', (text) => {
        renderWithRouter(<DomainDetailModal domain={createDomainWithEntities()} onClose={vi.fn()} />)
        expect(screen.getByText(text)).toBeInTheDocument()
      })

      it('renders empty state when no entities', () => {
        const domain = createDomainDetails({ entities: [] })

        renderWithRouter(<DomainDetailModal domain={domain} onClose={vi.fn()} />)

        expect(screen.getByText('No entities in this domain')).toBeInTheDocument()
      })
    })

    describe('events section', () => {
      it('renders published events', () => {
        const domain = createDomainDetails({
          events: {
            published: [
              {
                id: 'e1',
                eventName: 'OrderPlaced',
                schema: undefined,
                sourceLocation: undefined,
                handlers: [],
              },
              {
                id: 'e2',
                eventName: 'OrderConfirmed',
                schema: undefined,
                sourceLocation: undefined,
                handlers: [],
              },
            ],
            consumed: [],
          },
        })

        renderWithRouter(<DomainDetailModal domain={domain} onClose={vi.fn()} />)

        expect(screen.getByText('Events')).toBeInTheDocument()
        expect(screen.getByText('Published')).toBeInTheDocument()
        expect(screen.getByText('OrderPlaced')).toBeInTheDocument()
        expect(screen.getByText('OrderConfirmed')).toBeInTheDocument()
      })

      it('renders consumed events', () => {
        const domain = createDomainDetails({
          events: {
            published: [],
            consumed: [
              {
                id: 'h1',
                handlerName: 'PaymentCompleted',
                description: undefined,
                subscribedEvents: [],
                subscribedEventsWithDomain: [],
                sourceLocation: undefined,
              },
              {
                id: 'h2',
                handlerName: 'InventoryReserved',
                description: undefined,
                subscribedEvents: [],
                subscribedEventsWithDomain: [],
                sourceLocation: undefined,
              },
            ],
          },
        })

        renderWithRouter(<DomainDetailModal domain={domain} onClose={vi.fn()} />)

        expect(screen.getByText('Consumed')).toBeInTheDocument()
        expect(screen.getByText('PaymentCompleted')).toBeInTheDocument()
        expect(screen.getByText('InventoryReserved')).toBeInTheDocument()
      })

      it('renders empty state when no events', () => {
        const domain = createDomainDetails({
          events: {
            published: [],
            consumed: [],
          },
        })

        renderWithRouter(<DomainDetailModal domain={domain} onClose={vi.fn()} />)

        expect(screen.getByText('No events in this domain')).toBeInTheDocument()
      })
    })

    describe('cross-domain edges section', () => {
      function createDomainWithCrossDomainEdges(): DomainDetails {
        return createDomainDetails({
          crossDomainEdges: [
            {
              targetDomain: 'inventory-domain',
              edgeType: 'async',
            },
            {
              targetDomain: 'payment-domain',
              edgeType: 'sync',
            },
          ],
        })
      }

      it.each([
        'Cross-Domain Connections',
        'inventory-domain',
        'async',
        'payment-domain',
        'sync',
      ])('renders %s in cross-domain edges section', (text) => {
        renderWithRouter(
          <DomainDetailModal domain={createDomainWithCrossDomainEdges()} onClose={vi.fn()} />,
        )
        expect(screen.getByText(text)).toBeInTheDocument()
      })

      it('renders empty state when no cross-domain edges', () => {
        const domain = createDomainDetails({ crossDomainEdges: [] })

        renderWithRouter(<DomainDetailModal domain={domain} onClose={vi.fn()} />)

        expect(screen.getByText('No cross-domain connections')).toBeInTheDocument()
      })
    })

    describe('backdrop interaction', () => {
      it('calls onClose when backdrop clicked', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()

        renderWithRouter(<DomainDetailModal domain={createDomainDetails()} onClose={onClose} />)

        await user.click(screen.getByTestId('modal-backdrop'))

        expect(onClose).toHaveBeenCalledWith(expect.anything())
      })
    })

    describe('keyboard navigation', () => {
      it('calls onClose when Escape pressed', async () => {
        const user = userEvent.setup()
        const onClose = vi.fn()

        renderWithRouter(<DomainDetailModal domain={createDomainDetails()} onClose={onClose} />)

        await user.keyboard('{Escape}')

        expect(onClose).toHaveBeenCalledWith()
      })
    })

    describe('accessibility', () => {
      it('has role dialog', () => {
        renderWithRouter(<DomainDetailModal domain={createDomainDetails()} onClose={vi.fn()} />)

        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      it('has aria-labelledby pointing to title', () => {
        renderWithRouter(<DomainDetailModal domain={createDomainDetails()} onClose={vi.fn()} />)

        const dialog = screen.getByRole('dialog')
        const labelledBy = assertDefined(
          dialog.getAttribute('aria-labelledby'),
          'Dialog missing aria-labelledby',
        )

        const title = document.getElementById(labelledBy)
        expect(title).toBeInTheDocument()
      })
    })
  })
})
