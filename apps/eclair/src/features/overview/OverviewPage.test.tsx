import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { OverviewPage } from './OverviewPage'
import type { RiviereGraph } from '@/types/riviere'
import { parseNode, parseEdge, parseDomainMetadata } from '@/lib/riviereTestData'


const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }
function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function createTestGraph(overrides: Partial<RiviereGraph> = {}): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'Test Architecture',
      description: 'Test description',
      domains: parseDomainMetadata({
        'order-domain': { description: 'Order management', systemType: 'domain' },
        'payment-domain': { description: 'Payment processing', systemType: 'domain' },
      }),
    },
    components: [
      parseNode({ sourceLocation: testSourceLocation, id: 'n1', type: 'UI', name: '/orders', domain: 'order-domain', module: 'm1', route: '/orders' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'n2', type: 'API', name: 'Place Order', domain: 'order-domain', module: 'm1', apiType: 'REST', httpMethod: 'POST', path: '/api/orders' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'n3', type: 'UseCase', name: 'Place Order UC', domain: 'order-domain', module: 'm1' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'n4', type: 'DomainOp', name: 'Order.begin', domain: 'order-domain', module: 'm1', entity: 'Order', operationName: 'begin' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'n5', type: 'Event', name: 'OrderPlaced', domain: 'order-domain', module: 'm1', eventName: 'OrderPlaced' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'n6', type: 'API', name: 'Process Payment', domain: 'payment-domain', module: 'm1', apiType: 'REST', httpMethod: 'POST', path: '/api/payments' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'n7', type: 'DomainOp', name: 'Payment.authorize', domain: 'payment-domain', module: 'm1', entity: 'Payment', operationName: 'authorize' }),
    ],
    links: [
      parseEdge({ source: 'n1', target: 'n2' }),
      parseEdge({ source: 'n2', target: 'n3' }),
      parseEdge({ source: 'n3', target: 'n4' }),
    ],
    ...overrides,
  }
}

describe('OverviewPage', () => {
  it('renders page header with title and subtitle', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByText('Architecture summary and quick access')).toBeInTheDocument()
  })

  it('renders stats bar with correct values', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByText('Nodes')).toBeInTheDocument()
    expect(screen.getByText('APIs')).toBeInTheDocument()
    expect(screen.getByText('Events')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('renders domain cards for each domain', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByText('order-domain')).toBeInTheDocument()
    expect(screen.getByText('payment-domain')).toBeInTheDocument()
  })

  it('renders domain description in cards', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByText('Order management')).toBeInTheDocument()
    expect(screen.getByText('Payment processing')).toBeInTheDocument()
  })

  it('renders node breakdown in domain cards', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getAllByText('Node Breakdown')).toHaveLength(2)
  })

  it('renders entities in domain cards', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByText('Order')).toBeInTheDocument()
    expect(screen.getByText('Payment')).toBeInTheDocument()
  })

  it('renders entry points in domain cards', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByText('/orders')).toBeInTheDocument()
    expect(screen.getByText('/api/orders')).toBeInTheDocument()
  })

  it('renders Domains section header', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByRole('heading', { name: 'Domains' })).toBeInTheDocument()
  })

  it('renders View Details link in each domain card', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    const viewDetailsLinks = screen.getAllByRole('link', { name: /View details for/i })
    expect(viewDetailsLinks).toHaveLength(2)
  })

  it('renders View on Domain Map link in each domain card', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    const mapLinks = screen.getAllByRole('link', { name: /View on Domain Map|on Domain Map/i })
    expect(mapLinks).toHaveLength(2)
  })

  it('renders repository link when sourceLocation has repository', () => {
    const graph = createTestGraph({
      components: [
        parseNode({
          id: 'n1',
          type: 'API',
        apiType: 'other',
          name: 'Test API',
          domain: 'order-domain',
          module: 'm1',
          sourceLocation: { filePath: '/src/api.ts', repository: 'ecommerce-app' },
        }),
        parseNode({
          id: 'n2',
          type: 'API',
        apiType: 'other',
          name: 'Payment API',
          domain: 'payment-domain',
          module: 'm1',
          sourceLocation: { filePath: '/src/payment.ts', repository: 'payment-service' },
        }),
      ],
    })

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByText('ecommerce-app')).toBeInTheDocument()
    expect(screen.getByText('payment-service')).toBeInTheDocument()
  })

  it('renders view mode toggle with Grid and List buttons', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByRole('button', { name: /Grid/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /List/i })).toBeInTheDocument()
  })

  it('has Grid view active by default', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    const gridButton = screen.getByRole('button', { name: /Grid/i })
    expect(gridButton).toHaveClass('active')
  })

  it('renders search input', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByPlaceholderText('Search domains...')).toBeInTheDocument()
  })

  it('renders type filter tags', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Domain' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'UI' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'BFF' })).toBeInTheDocument()
  })

  it('renders stats with icons', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    const nodesLabel = screen.getByText('Nodes')
    const statsItem = nodesLabel.closest('.flex.items-center')
    expect(statsItem?.querySelector('.ph-graph')).toBeInTheDocument()
  })

  it('always renders repository link in card footer', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    const repoLinks = screen.getAllByRole('link', { name: /github/i })
    expect(repoLinks.length).toBeGreaterThan(0)
  })

  it('View Details links navigate to domain detail page', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    const orderDomainLink = screen.getByRole('link', { name: /View details for order-domain/i })
    expect(orderDomainLink).toHaveAttribute('href', '/domains/order-domain')

    const paymentDomainLink = screen.getByRole('link', { name: /View details for payment-domain/i })
    expect(paymentDomainLink).toHaveAttribute('href', '/domains/payment-domain')
  })

  describe('Search functionality', () => {
    it('filters domains by name when searching', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const searchInput = screen.getByPlaceholderText('Search domains...')
      await user.type(searchInput, 'order')

      expect(screen.getByText('order-domain')).toBeInTheDocument()
      expect(screen.queryByText('payment-domain')).not.toBeInTheDocument()
    })

    it('filters domains by description when searching', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const searchInput = screen.getByPlaceholderText('Search domains...')
      await user.type(searchInput, 'payment')

      expect(screen.getByText('payment-domain')).toBeInTheDocument()
      expect(screen.queryByText('order-domain')).not.toBeInTheDocument()
    })

    it('shows all domains when search is cleared', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const searchInput = screen.getByPlaceholderText('Search domains...')
      await user.type(searchInput, 'order')
      expect(screen.queryByText('payment-domain')).not.toBeInTheDocument()

      await user.clear(searchInput)
      expect(screen.getByText('payment-domain')).toBeInTheDocument()
      expect(screen.getByText('order-domain')).toBeInTheDocument()
    })

    it('is case-insensitive', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const searchInput = screen.getByPlaceholderText('Search domains...')
      await user.type(searchInput, 'ORDER')

      expect(screen.getByText('order-domain')).toBeInTheDocument()
    })
  })

  describe('Filter functionality', () => {
    it('filters domains by system type', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const domainFilterButton = screen.getByRole('button', { name: 'Domain' })
      await user.click(domainFilterButton)

      expect(screen.getByText('order-domain')).toBeInTheDocument()
      expect(screen.getByText('payment-domain')).toBeInTheDocument()
    })

    it('shows All domains when All filter is active', () => {
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const allButton = screen.getByRole('button', { name: 'All' })
      expect(allButton).toHaveClass('active')

      expect(screen.getByText('order-domain')).toBeInTheDocument()
      expect(screen.getByText('payment-domain')).toBeInTheDocument()
    })

    it('switches active filter class when clicking filter buttons', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const allButton = screen.getByRole('button', { name: 'All' })
      const domainButton = screen.getByRole('button', { name: 'Domain' })

      expect(allButton).toHaveClass('active')
      expect(domainButton).not.toHaveClass('active')

      await user.click(domainButton)

      expect(domainButton).toHaveClass('active')
      expect(allButton).not.toHaveClass('active')
    })
  })

  describe('View mode switching', () => {
    it('switches from grid to list view', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const listButton = screen.getByRole('button', { name: /List/i })
      await user.click(listButton)

      expect(listButton).toHaveClass('active')
      expect(screen.getByRole('button', { name: /Grid/i })).not.toHaveClass('active')
    })

    it('switches from list to grid view', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const gridButton = screen.getByRole('button', { name: /Grid/i })
      const listButton = screen.getByRole('button', { name: /List/i })

      await user.click(listButton)
      expect(listButton).toHaveClass('active')

      await user.click(gridButton)
      expect(gridButton).toHaveClass('active')
      expect(listButton).not.toHaveClass('active')
    })

    it('grid view button is active by default', () => {
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const gridButton = screen.getByRole('button', { name: /Grid/i })
      expect(gridButton).toHaveClass('active')
    })
  })

  describe('Combined filters and search', () => {
    it('applies both search and filter together', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const searchInput = screen.getByPlaceholderText('Search domains...')
      await user.type(searchInput, 'order')

      const domainFilter = screen.getByRole('button', { name: 'Domain' })
      await user.click(domainFilter)

      expect(screen.getByText('order-domain')).toBeInTheDocument()
      expect(screen.queryByText('payment-domain')).not.toBeInTheDocument()
    })

    it('shows no results when search and filter have no matches', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderWithRouter(<OverviewPage graph={graph} />)

      const searchInput = screen.getByPlaceholderText('Search domains...')
      await user.type(searchInput, 'nonexistent')

      const cards = screen.queryAllByRole('link', { name: /View details for/i })
      expect(cards).toHaveLength(0)
    })
  })
})
