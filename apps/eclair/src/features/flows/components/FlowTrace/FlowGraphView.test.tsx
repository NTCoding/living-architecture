import {
 describe, it, expect, vi, beforeEach, afterEach 
} from 'vitest'
import {
 render, screen, act, fireEvent 
} from '@testing-library/react'
import { FlowGraphView } from './FlowGraphView'
import {
 parseNode, parseEdge, parseDomainMetadata 
} from '@/lib/riviereTestData'
import type { FlowStep } from '../../extractFlows'
import type { RiviereGraph } from '@/types/riviere'
import type { TooltipData } from '@/features/full-graph/types'

const testSourceLocation = {
 repository: 'test-repo',
filePath: 'src/test.ts' 
}

vi.mock('@/contexts/ThemeContext', () => ({useTheme: () => ({ theme: 'stream' }),}))

interface MockState {onNodeHover: ((data: TooltipData | null) => void) | undefined}

const mockState: MockState = { onNodeHover: undefined }

vi.mock('@/features/full-graph/components/ForceGraph/ForceGraph', () => ({
  ForceGraph: ({
    graph,
    onNodeHover,
  }: {
    graph: { components: Array<{ name: string }> }
    onNodeHover?: (data: TooltipData | null) => void
  }) => {
    mockState.onNodeHover = onNodeHover
    return (
      <div data-testid="force-graph-mock">
        {graph.components.map((node) => (
          <span key={node.name}>{node.name}</span>
        ))}
      </div>
    )
  },
}))

vi.mock('@/features/full-graph/components/GraphTooltip/GraphTooltip', () => ({
  GraphTooltip: ({
    data,
    onMouseEnter,
    onMouseLeave,
  }: {
    data: TooltipData | null
    onMouseEnter?: () => void
    onMouseLeave?: () => void
  }) => (
    <div
      data-testid="graph-tooltip-mock"
      data-has-data={data !== null}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {data === null ? 'No tooltip' : `Tooltip: ${data.node.name}`}
    </div>
  ),
}))

function createTestSteps(): FlowStep[] {
  return [
    {
      node: parseNode({
 sourceLocation: testSourceLocation,
id: 'ui-1',
type: 'UI',
name: 'Order Form',
domain: 'checkout',
module: 'ui',
route: '/orders' 
}),
      edgeType: 'sync',
      depth: 0,
      externalLinks: [],
    },
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
      edgeType: null,
      depth: 1,
      externalLinks: [],
    },
  ]
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
id: 'ui-1',
type: 'UI',
name: 'Order Form',
domain: 'checkout',
module: 'ui',
route: '/orders' 
}),
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
id: 'other-node',
type: 'UseCase',
name: 'Other',
domain: 'other',
module: 'other' 
}),
    ],
    links: [
      parseEdge({
 source: 'ui-1',
target: 'api-1',
type: 'sync' 
}),
      parseEdge({
 source: 'api-1',
target: 'other-node',
type: 'sync' 
}),
    ],
  }
}

function createTooltipData(name: string): TooltipData {
  return {
    node: {
      id: 'test-node',
      type: 'UI',
      name,
      domain: 'test',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: 'test-node',
        type: 'UI',
        name,
        domain: 'test',
        module: 'test',
        route: '/test',
      }),
    },
    x: 100,
    y: 100,
    incomingCount: 1,
    outgoingCount: 2,
  }
}

describe('FlowGraphView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockState.onNodeHover = undefined
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders ForceGraph with nodes from steps', () => {
    render(<FlowGraphView steps={createTestSteps()} graph={createTestGraph()} />)

    expect(screen.getByTestId('force-graph-mock')).toBeInTheDocument()
    expect(screen.getByText('Order Form')).toBeInTheDocument()
    expect(screen.getByText('POST /orders')).toBeInTheDocument()
  })

  it('wraps ForceGraph in flow-graph-container', () => {
    render(<FlowGraphView steps={createTestSteps()} graph={createTestGraph()} />)

    const container = screen.getByTestId('force-graph-mock').parentElement
    expect(container).toHaveClass('flow-graph-container')
  })

  it('filters graph to only include nodes in steps', () => {
    render(<FlowGraphView steps={createTestSteps()} graph={createTestGraph()} />)

    expect(screen.getByText('Order Form')).toBeInTheDocument()
    expect(screen.getByText('POST /orders')).toBeInTheDocument()
    expect(screen.queryByText('Other')).not.toBeInTheDocument()
  })

  describe('tooltip behavior', () => {
    it('shows tooltip when node hover callback is called with data', () => {
      render(<FlowGraphView steps={createTestSteps()} graph={createTestGraph()} />)

      act(() => {
        mockState.onNodeHover?.(createTooltipData('Test Node'))
      })

      expect(screen.getByText('Tooltip: Test Node')).toBeInTheDocument()
    })

    it('hides tooltip after delay when node hover callback is called with null', () => {
      render(<FlowGraphView steps={createTestSteps()} graph={createTestGraph()} />)

      act(() => {
        mockState.onNodeHover?.(createTooltipData('Test Node'))
      })
      expect(screen.getByText('Tooltip: Test Node')).toBeInTheDocument()

      act(() => {
        mockState.onNodeHover?.(null)
      })
      expect(screen.getByText('Tooltip: Test Node')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(200)
      })
      expect(screen.getByText('No tooltip')).toBeInTheDocument()
    })

    it('cancels hide timeout when hovering new node before timeout completes', () => {
      render(<FlowGraphView steps={createTestSteps()} graph={createTestGraph()} />)

      act(() => {
        mockState.onNodeHover?.(createTooltipData('First Node'))
      })
      act(() => {
        mockState.onNodeHover?.(null)
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
      act(() => {
        mockState.onNodeHover?.(createTooltipData('Second Node'))
      })
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(screen.getByText('Tooltip: Second Node')).toBeInTheDocument()
    })

    it('restores tooltip when same node is re-hovered before timeout completes', () => {
      render(<FlowGraphView steps={createTestSteps()} graph={createTestGraph()} />)

      act(() => {
        mockState.onNodeHover?.(createTooltipData('Test Node'))
      })
      act(() => {
        mockState.onNodeHover?.(null)
      })
      act(() => {
        vi.advanceTimersByTime(100)
      })
      act(() => {
        mockState.onNodeHover?.(createTooltipData('Test Node'))
      })
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(screen.getByText('Tooltip: Test Node')).toBeInTheDocument()
    })

    it('keeps tooltip visible when mouse enters tooltip', () => {
      render(<FlowGraphView steps={createTestSteps()} graph={createTestGraph()} />)

      act(() => {
        mockState.onNodeHover?.(createTooltipData('Test Node'))
      })
      act(() => {
        mockState.onNodeHover?.(null)
      })

      const tooltip = screen.getByTestId('graph-tooltip-mock')
      fireEvent.mouseEnter(tooltip)

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(screen.getByText('Tooltip: Test Node')).toBeInTheDocument()
    })

    it('hides tooltip after delay when mouse leaves tooltip', () => {
      render(<FlowGraphView steps={createTestSteps()} graph={createTestGraph()} />)

      act(() => {
        mockState.onNodeHover?.(createTooltipData('Test Node'))
      })

      const tooltip = screen.getByTestId('graph-tooltip-mock')
      fireEvent.mouseLeave(tooltip)

      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(screen.getByText('No tooltip')).toBeInTheDocument()
    })
  })
})
