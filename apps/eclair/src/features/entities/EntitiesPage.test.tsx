import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { EntitiesPage } from './EntitiesPage'
import { parseNode, parseEdge, parseDomainMetadata } from '@/lib/riviereTestData'
import type { RiviereGraph } from '@/types/riviere'
const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

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
    version: '1.0.0',
    metadata: {
      name: 'Test Architecture',
      description: 'Test description',
      domains: parseDomainMetadata({
        'order-domain': {
          description: 'Order management',
          systemType: 'domain',
          entities: {
            'Order': {
              description: 'Core order entity',
              stateMachine: {
                states: ['Pending', 'Confirmed', 'Shipped'],
                initialState: 'Pending',
                terminalStates: ['Shipped'],
              },
              invariants: ['order.total > 0'],
            },
          },
        },
      }),
    },
    components: [
      parseNode({ sourceLocation: testSourceLocation, id: 'n1', type: 'API', name: 'Place Order', domain: 'order-domain', module: 'm1', path: '/api/orders' }),
      parseNode({ sourceLocation: testSourceLocation,         id: 'n2',
        type: 'DomainOp',
        name: 'Order.begin',
        domain: 'order-domain',
        module: 'm1',
        entity: 'Order',
        operationName: 'begin',
        stateChanges: [{ from: 'Draft', to: 'Pending' }],
      }),
      parseNode({ sourceLocation: testSourceLocation,         id: 'n3',
        type: 'DomainOp',
        name: 'Order.confirm',
        domain: 'order-domain',
        module: 'm1',
        entity: 'Order',
        operationName: 'confirm',
        stateChanges: [{ from: 'Pending', to: 'Confirmed' }],
      }),
    ],
    links: [
      parseEdge({ source: 'n1', target: 'n2' }),
    ],
  }
}

describe('EntitiesPage', () => {
  it('renders page title', () => {
    const graph = createTestGraph()
    render(<EntitiesPage graph={graph} />)

    expect(screen.getByRole('heading', { name: 'Entities' })).toBeInTheDocument()
  })

  it('displays entities grouped by domain', () => {
    const graph = createTestGraph()
    render(<EntitiesPage graph={graph} />)

    expect(screen.getAllByText('order-domain').length).toBeGreaterThan(0)
    expect(screen.getByText('Order')).toBeInTheDocument()
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

  it('filters entities by search query', async () => {
    const graph = createTestGraph()
    const user = userEvent.setup()
    render(<EntitiesPage graph={graph} />)

    const searchInput = screen.getByPlaceholderText('Search entities...')
    await user.type(searchInput, 'Order')

    expect(screen.getByText('Order')).toBeInTheDocument()
    expect(screen.getByText(/1 entity found/)).toBeInTheDocument()
  })

  it('filters entities by domain', async () => {
    const graph = createTestGraph()
    const user = userEvent.setup()
    render(<EntitiesPage graph={graph} />)

    const domainSelect = screen.getByDisplayValue('All Domains')
    await user.selectOptions(domainSelect, 'order-domain')

    expect(screen.getByText('Order')).toBeInTheDocument()
  })

  it('navigates to full graph when view on graph button clicked', async () => {
    const user = userEvent.setup()
    const graph = createTestGraph()

    render(
      <MemoryRouter>
        <EntitiesPage graph={graph} />
      </MemoryRouter>
    )

    const graphButton = screen.getByTitle('View on Graph')
    await user.click(graphButton)

    expect(mockNavigate).toHaveBeenCalledWith('/full-graph?node=Order')
  })

  it('resets to all domains filter after selecting a specific domain', async () => {
    const graph = createTestGraph()
    const user = userEvent.setup()
    render(<EntitiesPage graph={graph} />)

    const domainSelect = screen.getByDisplayValue('All Domains')
    await user.selectOptions(domainSelect, 'order-domain')

    expect(screen.getByDisplayValue('order-domain')).toBeInTheDocument()

    await user.selectOptions(domainSelect, 'all')

    expect(screen.getByDisplayValue('All Domains')).toBeInTheDocument()
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
