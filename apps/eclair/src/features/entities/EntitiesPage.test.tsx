import {
 describe, it, expect, vi 
} from 'vitest'
import {
 render, screen 
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { EntitiesPage } from './EntitiesPage'
import {
 parseNode, parseEdge, parseDomainMetadata 
} from '@/lib/riviereTestData'
import type { RiviereGraph } from '@/types/riviere'
const testSourceLocation = {
 repository: 'test-repo',
filePath: 'src/test.ts' 
}

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function createTestGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'Test Architecture',
      description: 'Test description',
      domains: parseDomainMetadata({
        'order-domain': {
 description: 'Order management',
systemType: 'domain' 
},
        'payment-domain': {
 description: 'Payment processing',
systemType: 'domain' 
},
      }),
    },
    components: [
      // Order domain - API and Order entity
      parseNode({
 sourceLocation: testSourceLocation,
id: 'n1',
type: 'API',
name: 'Place Order',
domain: 'order-domain',
module: 'm1',
httpMethod: 'POST',
path: '/api/orders' 
}),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'n2',
        type: 'DomainOp',
        name: 'Order.begin',
        domain: 'order-domain',
        module: 'm1',
        entity: 'Order',
        operationName: 'begin',
        stateChanges: [{
 from: 'Draft',
to: 'Pending' 
}],
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'n3',
        type: 'DomainOp',
        name: 'Order.confirm',
        domain: 'order-domain',
        module: 'm1',
        entity: 'Order',
        operationName: 'confirm',
        stateChanges: [{
 from: 'Pending',
to: 'Confirmed' 
}],
      }),
      // Payment domain - Payment entity
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'n4',
        type: 'DomainOp',
        name: 'Payment.process',
        domain: 'payment-domain',
        module: 'm2',
        entity: 'Payment',
        operationName: 'process',
      }),
      // Payment domain - Invoice entity
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'n5',
        type: 'DomainOp',
        name: 'Invoice.generate',
        domain: 'payment-domain',
        module: 'm2',
        entity: 'Invoice',
        operationName: 'generate',
      }),
    ],
    links: [
      parseEdge({
 source: 'n1',
target: 'n2' 
}),
    ],
  }
}

describe('EntitiesPage', () => {
  it('renders page title', () => {
    const graph = createTestGraph()
    render(<EntitiesPage graph={graph} />)

    expect(screen.getByRole('heading', { name: 'Entities' })).toBeInTheDocument()
  })

  it('displays all entities from graph', () => {
    const graph = createTestGraph()
    render(<EntitiesPage graph={graph} />)

    // Shows entities from all domains
    expect(screen.getByText('Order')).toBeInTheDocument()
    expect(screen.getByText('Payment')).toBeInTheDocument()
    expect(screen.getByText('Invoice')).toBeInTheDocument()
  })

  it('displays stats bar with entity and operation counts', () => {
    const graph = createTestGraph()
    render(<EntitiesPage graph={graph} />)

    expect(screen.getByTestId('stat-total-entities')).toHaveTextContent('3')
    expect(screen.getByTestId('stat-total-operations')).toHaveTextContent('4')
  })

  it('renders state machine when entity card is expanded', async () => {
    const user = userEvent.setup()
    const graph = createTestGraph()
    render(<EntitiesPage graph={graph} />)

    expect(screen.queryByText('Pending')).not.toBeInTheDocument()

    const entityButton = screen.getByText('Order')
    await user.click(entityButton.closest('button') || entityButton)

    expect(screen.getByText('Draft')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })

  it('lists entity operations when card is expanded', async () => {
    const user = userEvent.setup()
    const graph = createTestGraph()
    render(<EntitiesPage graph={graph} />)

    expect(screen.queryByText(/begin/)).not.toBeInTheDocument()

    const entityButton = screen.getByText('Order')
    await user.click(entityButton.closest('button') || entityButton)

    expect(screen.getByText(/begin/)).toBeInTheDocument()
    expect(screen.getByText(/confirm/)).toBeInTheDocument()
  })

  it('filters entities by search query - shows matching, hides non-matching', async () => {
    const graph = createTestGraph()
    const user = userEvent.setup()
    render(<EntitiesPage graph={graph} />)

    const searchInput = screen.getByPlaceholderText('Search entities...')
    await user.type(searchInput, 'Invoice')

    expect(screen.getByText('Invoice')).toBeInTheDocument()
    expect(screen.queryByText('Order')).not.toBeInTheDocument()
    expect(screen.queryByText('Payment')).not.toBeInTheDocument()
  })

  it('filters entities by domain - shows domain entities, hides others', async () => {
    const graph = createTestGraph()
    const user = userEvent.setup()
    render(<EntitiesPage graph={graph} />)

    const paymentDomainButton = screen.getByRole('button', { name: 'payment-domain' })
    await user.click(paymentDomainButton)

    expect(screen.getByText('Payment')).toBeInTheDocument()
    expect(screen.getByText('Invoice')).toBeInTheDocument()
    expect(screen.queryByText('Order')).not.toBeInTheDocument()
  })

  it('navigates to full graph with node ID when view on graph button clicked', async () => {
    const user = userEvent.setup()
    const graph = createTestGraph()

    render(
      <MemoryRouter>
        <EntitiesPage graph={graph} />
      </MemoryRouter>
    )

    // Entities sorted alphabetically: Invoice, Order, Payment - click first one (Invoice)
    const graphButtons = screen.getAllByTitle('View on Graph')
    await user.click(graphButtons[0])

    expect(mockNavigate).toHaveBeenCalledWith('/full-graph?node=n5')
  })

  it('toggles domain filter off when clicking same domain button again', async () => {
    const graph = createTestGraph()
    const user = userEvent.setup()
    render(<EntitiesPage graph={graph} />)

    const orderDomainButton = screen.getByRole('button', { name: 'order-domain' })
    await user.click(orderDomainButton)

    expect(screen.getByText('Order')).toBeInTheDocument()
    expect(screen.queryByText('Invoice')).not.toBeInTheDocument()

    await user.click(orderDomainButton)

    expect(screen.getByText('Order')).toBeInTheDocument()
    expect(screen.getByText('Invoice')).toBeInTheDocument()
  })

  it('shows no entities message when search matches nothing', async () => {
    const graph = createTestGraph()
    const user = userEvent.setup()
    render(<EntitiesPage graph={graph} />)

    const searchInput = screen.getByPlaceholderText('Search entities...')
    await user.type(searchInput, 'nonexistent-entity-xyz')

    expect(screen.getByText('No entities found')).toBeInTheDocument()
  })
})
