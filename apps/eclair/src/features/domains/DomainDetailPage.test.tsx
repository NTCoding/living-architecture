import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { DomainDetailPage } from './DomainDetailPage'
import { parseNode, parseEdge, parseDomainMetadata } from '@/lib/riviereTestData'
import type { RiviereGraph } from '@/types/riviere'

const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

function createTestGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'Test Architecture',
      description: 'Test description',
      domains: parseDomainMetadata({
        'order-domain': { description: 'Order management', systemType: 'domain' },
      }),
    },
    components: [
      parseNode({ sourceLocation: testSourceLocation, id: 'n1', type: 'API', name: 'Place Order', domain: 'order-domain', module: 'm1', apiType: 'REST', httpMethod: 'POST', path: '/api/orders' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'n2', type: 'UseCase', name: 'Place Order UC', domain: 'order-domain', module: 'm1' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'n3', type: 'DomainOp', name: 'Order.begin', domain: 'order-domain', module: 'm1', entity: 'Order', operationName: 'begin' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'n4', type: 'Event', name: 'OrderPlaced', domain: 'order-domain', module: 'm1', eventName: 'OrderPlaced' }),
    ],
    links: [
      parseEdge({ source: 'n1', target: 'n2' }),
      parseEdge({ source: 'n2', target: 'n3' }),
    ],
  }
}

function renderAtRoute(graph: RiviereGraph, path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/domains/:domainId" element={<DomainDetailPage graph={graph} />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('DomainDetailPage', () => {
  it('renders domain name as page title', () => {
    const graph = createTestGraph()

    renderAtRoute(graph, '/domains/order-domain')

    expect(screen.getByRole('heading', { name: 'order-domain' })).toBeInTheDocument()
  })

  it('renders domain description', () => {
    const graph = createTestGraph()

    renderAtRoute(graph, '/domains/order-domain')

    expect(screen.getByText('Order management')).toBeInTheDocument()
  })

  it('renders nodes section with node list', () => {
    const graph = createTestGraph()

    renderAtRoute(graph, '/domains/order-domain')

    expect(screen.getByText('Nodes')).toBeInTheDocument()
    expect(screen.getByText('Place Order')).toBeInTheDocument()
    expect(screen.getByText('Place Order UC')).toBeInTheDocument()
  })

  describe('nodes section', () => {
    it('renders code link for nodes with sourceLocation', () => {
      const graph = createTestGraph()
      const firstNode = graph.components[0]
      if (firstNode !== undefined) {
        firstNode.sourceLocation = {
          filePath: 'src/api/orders.ts',
          lineNumber: 42,
          repository: 'ecommerce-app',
        }
      }

      renderAtRoute(graph, '/domains/order-domain')

      expect(screen.getByTestId('code-link-path')).toHaveTextContent('src/api/orders.ts:42')
    })

    it('does not render code link for nodes without sourceLocation', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      expect(screen.queryByTestId('code-link-path')).not.toBeInTheDocument()
    })
  })

  it('renders entities section', () => {
    const graph = createTestGraph()

    renderAtRoute(graph, '/domains/order-domain')

    expect(screen.getAllByText(/Entities/).length).toBeGreaterThan(0)
    expect(screen.getByText('Order')).toBeInTheDocument()
  })

  it('renders events section with published events', () => {
    const graph = createTestGraph()

    renderAtRoute(graph, '/domains/order-domain')

    expect(screen.getAllByText(/Events/).length).toBeGreaterThan(0)
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  describe('events section', () => {
    it('renders published events with lightning icon', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      const publishedSection = screen.getByTestId('published-events')
      expect(within(publishedSection).getByText('OrderPlaced')).toBeInTheDocument()
      expect(publishedSection.querySelector('.ph-lightning')).toBeInTheDocument()
    })

    it('renders consumed events with ear icon', () => {
      const graph = createTestGraph()
      graph.components.push(
        parseNode({ sourceLocation: testSourceLocation,           id: 'n5',
          type: 'EventHandler',
          name: 'Handle Payment',
          domain: 'order-domain',
          module: 'm1',
          subscribedEvents: ['PaymentReceived'],
        })
      )

      renderAtRoute(graph, '/domains/order-domain')

      const consumedSection = screen.getByTestId('consumed-events')
      expect(within(consumedSection).getByText('Handle Payment')).toBeInTheDocument()
      expect(consumedSection.querySelector('.ph-ear')).toBeInTheDocument()
    })
  })


  it('shows error message when domain not found', () => {
    const graph = createTestGraph()

    renderAtRoute(graph, '/domains/nonexistent-domain')

    expect(screen.getByText(/domain not found/i)).toBeInTheDocument()
  })


  describe('view switcher', () => {
    it('renders view switcher with two options', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      const switcher = screen.getByRole('tablist', { name: /view mode/i })
      expect(switcher).toBeInTheDocument()
      expect(within(switcher).getByRole('tab', { name: /graph/i })).toBeInTheDocument()
      expect(within(switcher).getByRole('tab', { name: /details/i })).toBeInTheDocument()
    })

    it('starts in details view by default', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      const detailsTab = screen.getByRole('tab', { name: /details/i })
      expect(detailsTab).toHaveAttribute('aria-selected', 'true')
    })

    it('switches to graph view when Graph button clicked', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      await user.click(screen.getByRole('tab', { name: /graph/i }))

      expect(screen.getByRole('tab', { name: /graph/i })).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByRole('tab', { name: /details/i })).toHaveAttribute('aria-selected', 'false')
    })

    it('is keyboard accessible via arrow keys', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      const detailsTab = screen.getByRole('tab', { name: /details/i })
      detailsTab.focus()

      await user.keyboard('{ArrowLeft}')

      expect(screen.getByRole('tab', { name: /graph/i })).toHaveFocus()
    })
  })

  describe('layout panels', () => {
    it('renders detail panel in details view', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      expect(screen.getByTestId('detail-panel')).toBeInTheDocument()
    })

    it('renders graph panel when switched to graph view', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      await user.click(screen.getByRole('tab', { name: /graph/i }))

      expect(screen.getByTestId('graph-panel')).toBeInTheDocument()
    })
  })

  describe('header section', () => {
    it('renders domain name as prominent heading', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('order-domain')
    })

    it('renders description directly below heading', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      const header = screen.getByTestId('domain-header')
      const description = within(header).getByText('Order management')
      expect(description).toBeInTheDocument()
    })

    it('renders system type badge next to heading', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      const header = screen.getByTestId('domain-header')
      expect(within(header).getByText('domain')).toBeInTheDocument()
    })
  })

  describe('filters section', () => {
    it('renders search input with magnifying glass icon', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument()
      expect(screen.getByTestId('filters-section').querySelector('.ph-magnifying-glass')).toBeInTheDocument()
    })

    it('renders filter tags for node types', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      const filters = screen.getByTestId('filters-section')
      expect(within(filters).getByRole('button', { name: /all/i })).toBeInTheDocument()
    })

    it('hides filters section in graph view', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      await user.click(screen.getByRole('tab', { name: /graph/i }))

      expect(screen.queryByTestId('filters-section')).not.toBeInTheDocument()
    })
  })

  describe('stats row', () => {
    it('renders stats row below header', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      expect(screen.getByTestId('stats-row')).toBeInTheDocument()
    })

    it('shows entity count with icon', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      const statsRow = screen.getByTestId('stats-row')
      expect(within(statsRow).getByText(/entities/i)).toBeInTheDocument()
      expect(statsRow.querySelector('.ph-cube')).toBeInTheDocument()
    })

    it('shows operation count with icon', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      const statsRow = screen.getByTestId('stats-row')
      expect(within(statsRow).getByText(/operations/i)).toBeInTheDocument()
      expect(statsRow.querySelector('.ph-gear')).toBeInTheDocument()
    })

    it('shows event count with icon', () => {
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      const statsRow = screen.getByTestId('stats-row')
      expect(within(statsRow).getByText(/events/i)).toBeInTheDocument()
      expect(statsRow.querySelector('.ph-broadcast')).toBeInTheDocument()
    })

    it('hides stats row in graph view', async () => {
      const user = userEvent.setup()
      const graph = createTestGraph()

      renderAtRoute(graph, '/domains/order-domain')

      await user.click(screen.getByRole('tab', { name: /graph/i }))

      expect(screen.queryByTestId('stats-row')).not.toBeInTheDocument()
    })
  })
})
