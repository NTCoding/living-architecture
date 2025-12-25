import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { FullGraphPage } from './FullGraphPage'
import { ExportProvider } from '@/contexts/ExportContext'
import type { RiviereGraph } from '@/types/riviere'
import { parseNode, parseEdge, parseDomainKey } from '@/lib/riviereTestData'
import type { TooltipData, SimulationNode } from './types'
const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

const { capturedOnNodeHover } = vi.hoisted(() => {
  const ref: { current: ((data: TooltipData | null) => void) | undefined } = { current: undefined }
  return { capturedOnNodeHover: ref }
})

const mockGraph: RiviereGraph = {
  version: '1.0.0',
  metadata: {
    name: 'Test Graph',
    domains: {
      [parseDomainKey('orders')]: { description: 'Orders domain', systemType: 'domain' },
      [parseDomainKey('shipping')]: { description: 'Shipping domain', systemType: 'domain' },
    },
  },
  components: [
    parseNode({ sourceLocation: testSourceLocation, id: 'node-1', type: 'API', name: 'Test API', domain: 'orders', module: 'api' }),
    parseNode({ sourceLocation: testSourceLocation, id: 'node-2', type: 'UseCase', name: 'Test UseCase', domain: 'orders', module: 'core' }),
    parseNode({ sourceLocation: testSourceLocation, id: 'node-3', type: 'DomainOp', name: 'Ship Order', domain: 'shipping', module: 'core', operationName: 'ship' }),
  ],
  links: [
    parseEdge({ source: 'node-1', target: 'node-2', type: 'sync' }),
    parseEdge({ source: 'node-2', target: 'node-3', type: 'async' }),
  ],
}

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'stream', setTheme: vi.fn() }),
}))

vi.mock('./components/ForceGraph', () => ({
  ForceGraph: (props: { onNodeHover?: (data: TooltipData | null) => void; highlightedNodeId?: string | null }) => {
    if (props.onNodeHover !== undefined) {
      capturedOnNodeHover.current = props.onNodeHover
    }
    return (
      <div
        data-testid="force-graph-container"
        data-highlighted-node={props.highlightedNodeId}
      />
    )
  },
}))

vi.mock('d3', async () => {
  const actual = await vi.importActual<typeof import('d3')>('d3')
  return {
    ...actual,
    forceSimulation: vi.fn(() => ({
      force: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      stop: vi.fn(),
      tick: vi.fn(),
      alphaTarget: vi.fn().mockReturnThis(),
      restart: vi.fn(),
    })),
  }
})

function renderWithRouter(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ExportProvider>
        <FullGraphPage graph={mockGraph} />
      </ExportProvider>
    </MemoryRouter>
  )
}

describe('FullGraphPage', () => {
  test('renders page with correct test id', () => {
    renderWithRouter()
    expect(screen.getByTestId('full-graph-page')).toBeInTheDocument()
  })

  test('displays page title', () => {
    renderWithRouter()
    expect(screen.getByText('Full Graph')).toBeInTheDocument()
  })

  test('displays node and edge counts in stats panel', () => {
    renderWithRouter()
    expect(screen.getByTestId('stats-panel')).toBeInTheDocument()
    expect(screen.getByText('3 nodes')).toBeInTheDocument()
    expect(screen.getByText('2 edges')).toBeInTheDocument()
  })

  test('renders ForceGraph component', () => {
    renderWithRouter()
    expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
  })

  test('renders filter toggle button', () => {
    renderWithRouter()
    expect(screen.getByTestId('filter-toggle')).toBeInTheDocument()
  })

  test('highlights node from URL query param', () => {
    renderWithRouter(['/full-graph?node=node-1'])
    expect(screen.getByTestId('force-graph-container')).toHaveAttribute('data-highlighted-node', 'node-1')
  })

  describe('focused domain feature', () => {
    test('does not display focused domain banner when no domain focused', () => {
      renderWithRouter()
      expect(screen.queryByTestId('focused-domain-banner')).not.toBeInTheDocument()
    })

    test('displays stats panel when no domain focused', () => {
      renderWithRouter()
      expect(screen.getByTestId('stats-panel')).toBeInTheDocument()
      expect(screen.getByText('Full Graph')).toBeInTheDocument()
    })

    test('displays focused domain banner when domain is selected', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const filterToggle = screen.getByTestId('filter-toggle')
      await user.click(filterToggle)

      const domainCheckbox = screen.getByTestId('domain-checkbox-orders')
      await user.click(domainCheckbox)

      const banner = screen.getByTestId('focused-domain-banner')
      expect(banner).toBeInTheDocument()
      expect(banner).toHaveTextContent('orders')
    })

    test('displays correct node count in focused domain banner', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const filterToggle = screen.getByTestId('filter-toggle')
      await user.click(filterToggle)

      const ordersCheckbox = screen.getByTestId('domain-checkbox-orders')
      await user.click(ordersCheckbox)

      expect(screen.getByText('2 nodes focused')).toBeInTheDocument()
    })

    test('hides stats panel when domain is focused', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const filterToggle = screen.getByTestId('filter-toggle')
      await user.click(filterToggle)

      const domainCheckbox = screen.getByTestId('domain-checkbox-orders')
      await user.click(domainCheckbox)

      expect(screen.queryByTestId('stats-panel')).not.toBeInTheDocument()
    })

    test('clears focus when Clear focus button clicked', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const filterToggle = screen.getByTestId('filter-toggle')
      await user.click(filterToggle)

      const domainCheckbox = screen.getByTestId('domain-checkbox-shipping')
      await user.click(domainCheckbox)

      expect(screen.getByTestId('focused-domain-banner')).toBeInTheDocument()

      const clearButton = screen.getByText('Clear focus')
      await user.click(clearButton)

      expect(screen.queryByTestId('focused-domain-banner')).not.toBeInTheDocument()
      expect(screen.getByTestId('stats-panel')).toBeInTheDocument()
    })

    test('toggles domain focus on second click', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const filterToggle = screen.getByTestId('filter-toggle')
      await user.click(filterToggle)

      const domainCheckbox = screen.getByTestId('domain-checkbox-orders')

      await user.click(domainCheckbox)
      expect(screen.getByTestId('focused-domain-banner')).toBeInTheDocument()

      await user.click(domainCheckbox)
      expect(screen.queryByTestId('focused-domain-banner')).not.toBeInTheDocument()
    })

    test('passes focusedDomain prop to ForceGraph when domain selected', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const filterToggle = screen.getByTestId('filter-toggle')
      await user.click(filterToggle)

      const domainCheckbox = screen.getByTestId('domain-checkbox-orders')
      await user.click(domainCheckbox)

      const forceGraph = screen.getByTestId('force-graph-container')
      expect(forceGraph).toBeInTheDocument()
    })
  })

  describe('node type filters', () => {
    test('toggles node type visibility when checkbox clicked', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const filterToggle = screen.getByTestId('filter-toggle')
      await user.click(filterToggle)

      expect(screen.getByTestId('filter-panel')).toBeInTheDocument()

      const apiCheckbox = screen.getByTestId('node-type-checkbox-API')
      await user.click(apiCheckbox)

      expect(screen.getByText('2 nodes')).toBeInTheDocument()
    })

    test('restores node type visibility when checkbox clicked again', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const filterToggle = screen.getByTestId('filter-toggle')
      await user.click(filterToggle)

      const apiCheckbox = screen.getByTestId('node-type-checkbox-API')
      await user.click(apiCheckbox)

      expect(screen.getByText('2 nodes')).toBeInTheDocument()

      await user.click(apiCheckbox)

      expect(screen.getByText('3 nodes')).toBeInTheDocument()
    })

    test('hides all node types when Hide All clicked', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const filterToggle = screen.getByTestId('filter-toggle')
      await user.click(filterToggle)

      const hideAllButton = screen.getByTestId('node-type-filters-hide-all')
      await user.click(hideAllButton)

      expect(screen.getByText('0 nodes')).toBeInTheDocument()
    })

    test('shows all node types when Show All clicked after hiding', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const filterToggle = screen.getByTestId('filter-toggle')
      await user.click(filterToggle)

      const hideAllButton = screen.getByTestId('node-type-filters-hide-all')
      await user.click(hideAllButton)

      expect(screen.getByText('0 nodes')).toBeInTheDocument()

      const showAllButton = screen.getByTestId('node-type-filters-show-all')
      await user.click(showAllButton)

      expect(screen.getByText('3 nodes')).toBeInTheDocument()
    })
  })

  describe('search functionality', () => {
    test('filters visible nodes based on search query', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'Test API')

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('clears highlighted node when searching', async () => {
      const user = userEvent.setup()
      renderWithRouter(['/full-graph?node=node-1'])

      expect(screen.getByTestId('force-graph-container')).toHaveAttribute('data-highlighted-node', 'node-1')

      const searchInput = screen.getByPlaceholderText(/search/i)
      await user.type(searchInput, 'API')

      expect(screen.getByTestId('force-graph-container')).not.toHaveAttribute('data-highlighted-node', 'node-1')
    })
  })

  describe('tooltip mouse interaction', () => {
    const mockSimulationNode: SimulationNode = {
      id: 'node-1',
      type: 'API',
      name: 'Test API',
      domain: 'orders',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: 'node-1',
        type: 'API',
        name: 'Test API',
        domain: 'orders',
        module: 'api',
      }),
    }

    const mockTooltipData: TooltipData = {
      node: mockSimulationNode,
      x: 100,
      y: 200,
      incomingCount: 1,
      outgoingCount: 2,
    }

    beforeEach(() => {
      capturedOnNodeHover.current = undefined
    })

    test('captures onNodeHover callback from ForceGraph', () => {
      renderWithRouter()
      expect(capturedOnNodeHover.current).toBeDefined()
    })

    test('tooltip appears when onNodeHover is called', () => {
      renderWithRouter()

      act(() => {
        capturedOnNodeHover.current?.(mockTooltipData)
      })

      expect(screen.getByTestId('graph-tooltip')).toBeInTheDocument()
    })

    test('tooltip hides after debounce when mouse leaves tooltip', async () => {
      renderWithRouter()

      act(() => {
        capturedOnNodeHover.current?.(mockTooltipData)
      })

      expect(screen.getByTestId('graph-tooltip')).toBeInTheDocument()

      vi.useFakeTimers()

      const tooltip = screen.getByTestId('graph-tooltip')
      fireEvent.mouseLeave(tooltip)

      expect(screen.getByTestId('graph-tooltip')).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(199)
      })

      expect(screen.getByTestId('graph-tooltip')).toBeInTheDocument()

      await act(async () => {
        vi.advanceTimersByTime(1)
      })

      expect(screen.queryByTestId('graph-tooltip')).not.toBeInTheDocument()

      vi.useRealTimers()
    })

    test('tooltip stays visible when mouse re-enters before debounce expires', async () => {
      renderWithRouter()

      act(() => {
        capturedOnNodeHover.current?.(mockTooltipData)
      })

      expect(screen.getByTestId('graph-tooltip')).toBeInTheDocument()

      vi.useFakeTimers()

      const tooltip = screen.getByTestId('graph-tooltip')
      fireEvent.mouseLeave(tooltip)

      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      fireEvent.mouseEnter(tooltip)

      await act(async () => {
        vi.advanceTimersByTime(150)
      })

      expect(screen.getByTestId('graph-tooltip')).toBeInTheDocument()

      vi.useRealTimers()
    })
  })
})
