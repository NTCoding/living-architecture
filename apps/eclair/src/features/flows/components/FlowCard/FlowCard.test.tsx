import {
  describe, it, expect, vi 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { FlowCard } from './FlowCard'
import {
  parseNode, parseEdge, parseDomainMetadata 
} from '@/lib/riviereTestData'
import type { Flow } from '../../extractFlows'
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

function createTestFlow(): Flow {
  return {
    entryPoint: parseNode({
      id: 'api-1',
      type: 'API',
      apiType: 'other',
      name: 'POST /orders',
      domain: 'orders',
      module: 'api',
      httpMethod: 'POST',
      path: '/orders',
      sourceLocation: {
        repository: 'test-repo',
        filePath: 'src/api/orders/routes.ts',
        lineNumber: 42,
      },
    }),
    steps: [
      {
        node: parseNode({
          sourceLocation: testSourceLocation,
          id: 'api-1',
          type: 'API',
          name: 'POST /orders',
          domain: 'orders',
          module: 'api',
          httpMethod: 'POST',
          path: '/orders' 
        }),
        edgeType: 'sync',
        depth: 0,
        externalLinks: [],
      },
      {
        node: parseNode({
          sourceLocation: testSourceLocation,
          id: 'uc-1',
          type: 'UseCase',
          name: 'Place Order',
          domain: 'orders',
          module: 'checkout' 
        }),
        edgeType: null,
        depth: 1,
        externalLinks: [],
      },
    ],
  }
}

function createUIFlow(): Flow {
  return {
    entryPoint: parseNode({
      sourceLocation: testSourceLocation,
      id: 'ui-1',
      type: 'UI',
      name: 'Place Order Form',
      domain: 'checkout',
      module: 'ui',
      route: '/place-order',
    }),
    steps: [
      {
        node: parseNode({
          sourceLocation: testSourceLocation,
          id: 'ui-1',
          type: 'UI',
          name: 'Place Order Form',
          domain: 'checkout',
          module: 'ui',
          route: '/place-order' 
        }),
        edgeType: 'sync',
        depth: 0,
        externalLinks: [],
      },
    ],
  }
}

function createTestGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      domains: parseDomainMetadata({
        'test-domain': {
          description: 'Test domain',
          systemType: 'domain' 
        } 
      }) 
    },
    components: [
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'api-1',
        type: 'API',
        name: 'POST /orders',
        domain: 'orders',
        module: 'api',
        httpMethod: 'POST',
        path: '/orders' 
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'uc-1',
        type: 'UseCase',
        name: 'Place Order',
        domain: 'orders',
        module: 'checkout' 
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'ui-1',
        type: 'UI',
        name: 'Place Order Form',
        domain: 'checkout',
        module: 'ui',
        route: '/place-order' 
      }),
    ],
    links: [
      parseEdge({
        source: 'api-1',
        target: 'uc-1',
        type: 'sync' 
      }),
    ],
  }
}

function renderWithRouter(
  flow: Flow = createTestFlow(),
  graph: RiviereGraph = createTestGraph(),
  expanded = false,
  onToggle: () => void = () => {},
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <FlowCard flow={flow} graph={graph} expanded={expanded} onToggle={onToggle} />
    </MemoryRouter>
  )
}

describe('FlowCard', () => {
  describe('container', () => {
    it('renders with flow-item class', () => {
      render(<FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={() => {}} />)

      expect(screen.getByTestId('flow-card')).toHaveClass('flow-item')
    })
  })

  describe('header', () => {
    it('renders header with flow-item-header class', () => {
      render(<FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={() => {}} />)

      expect(screen.getByTestId('flow-card-header')).toHaveClass('flow-item-header')
    })

    it('renders left section with flow-item-left class', () => {
      render(<FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={() => {}} />)

      expect(screen.getByTestId('flow-item-left')).toHaveClass('flow-item-left')
    })

    it('renders node type badge with node-type-badge class', () => {
      render(<FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={() => {}} />)

      const badge = screen.getByTestId('node-type-badge')
      expect(badge).toHaveClass('node-type-badge')
      expect(badge).toHaveClass('badge-api')
    })

    it('renders title with flow-item-title class', () => {
      render(<FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={() => {}} />)

      const title = screen.getByText('POST /orders')
      expect(title).toHaveClass('flow-item-title')
    })

    it('displays title attribute with full entry point name for tooltip', () => {
      render(<FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={() => {}} />)

      const title = screen.getByText('POST /orders')
      expect(title).toHaveAttribute('title', 'POST /orders')
    })

    it('renders domain text', () => {
      render(<FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={() => {}} />)

      expect(screen.getByText('orders')).toHaveClass('flow-item-domain')
    })
  })

  describe('actions', () => {
    it('renders actions container with flow-item-actions class', () => {
      render(<FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={() => {}} />)

      expect(screen.getByTestId('flow-item-actions')).toHaveClass('flow-item-actions')
    })

    it('renders code link menu with source location when available', () => {
      render(<FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={() => {}} />)

      expect(screen.getByTitle('src/api/orders/routes.ts:42')).toHaveClass('code-link')
    })

    it('does not render code link when no source location', () => {
      render(<FlowCard flow={createUIFlow()} graph={createTestGraph()} expanded={false} onToggle={() => {}} />)

      expect(screen.queryByText(/src\//)).not.toBeInTheDocument()
    })

    it('renders View on Graph button with graph-link-btn class', () => {
      renderWithRouter()

      const graphBtn = screen.getByTitle('View on Full Graph')
      expect(graphBtn).toHaveClass('graph-link-btn')
    })

    it('navigates to full graph with node param when View on Graph clicked', async () => {
      const user = userEvent.setup()
      mockNavigate.mockClear()

      renderWithRouter()

      await user.click(screen.getByTitle('View on Full Graph'))

      expect(mockNavigate).toHaveBeenCalledWith('/full-graph?node=api-1')
    })
  })

  describe('expand/collapse', () => {
    it('renders chevron icon', () => {
      renderWithRouter()

      expect(screen.getByTestId('flow-card-chevron')).toBeInTheDocument()
    })

    it('rotates chevron when expanded', () => {
      renderWithRouter(createTestFlow(), createTestGraph(), true)

      expect(screen.getByTestId('flow-card-chevron')).toHaveClass('rotate-180')
    })

    it('does not show flow trace when collapsed', () => {
      renderWithRouter(createTestFlow(), createTestGraph(), false)

      expect(screen.queryByTestId('flow-trace')).not.toBeInTheDocument()
    })

    it('shows flow trace when expanded', () => {
      renderWithRouter(createTestFlow(), createTestGraph(), true)

      expect(screen.getByTestId('flow-trace')).toBeInTheDocument()
    })

    it('calls onToggle when header clicked', async () => {
      const onToggle = vi.fn()
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={onToggle} />
        </MemoryRouter>
      )

      await user.click(screen.getByTestId('flow-card-header'))

      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('header is keyboard accessible with tabIndex', () => {
      renderWithRouter()

      const header = screen.getByTestId('flow-card-header')
      expect(header).toHaveAttribute('tabIndex', '0')
    })

    it('header has button role', () => {
      renderWithRouter()

      const header = screen.getByTestId('flow-card-header')
      expect(header).toHaveAttribute('role', 'button')
    })

    it('toggles expanded state multiple times', async () => {
      const onToggle = vi.fn()
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={onToggle} />
        </MemoryRouter>
      )

      await user.click(screen.getByTestId('flow-card-header'))
      await user.click(screen.getByTestId('flow-card-header'))
      await user.click(screen.getByTestId('flow-card-header'))

      expect(onToggle).toHaveBeenCalledTimes(3)
    })

    it('calls onToggle when Enter key pressed on header', async () => {
      const onToggle = vi.fn()
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={onToggle} />
        </MemoryRouter>
      )

      const header = screen.getByTestId('flow-card-header')
      header.focus()
      await user.keyboard('{Enter}')

      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('calls onToggle when Space key pressed on header', async () => {
      const onToggle = vi.fn()
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={onToggle} />
        </MemoryRouter>
      )

      const header = screen.getByTestId('flow-card-header')
      header.focus()
      await user.keyboard(' ')

      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('does not toggle when other keys pressed on header', async () => {
      const onToggle = vi.fn()
      const user = userEvent.setup()

      render(
        <MemoryRouter>
          <FlowCard flow={createTestFlow()} graph={createTestGraph()} expanded={false} onToggle={onToggle} />
        </MemoryRouter>
      )

      const header = screen.getByTestId('flow-card-header')
      header.focus()
      await user.keyboard('a')

      expect(onToggle).not.toHaveBeenCalled()
    })
  })

  describe('code link edge cases', () => {
    it('does not render code link when sourceLocation has no lineNumber', () => {
      const flowWithoutLineNumber: Flow = {
        entryPoint: {
          id: 'api-1',
          type: 'API',
          apiType: 'other',
          name: 'POST /orders',
          domain: 'orders',
          module: 'api',
          httpMethod: 'POST',
          path: '/orders',
          sourceLocation: {
            repository: 'test-repo',
            filePath: 'src/api/orders/routes.ts',
          },
        },
        steps: [],
      }

      render(<FlowCard flow={flowWithoutLineNumber} graph={createTestGraph()} expanded={false} onToggle={() => {}} />)

      expect(screen.queryByTitle(/src\/api\/orders\/routes\.ts/)).not.toBeInTheDocument()
    })
  })
})
