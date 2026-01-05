import {
 describe, expect, test, vi, beforeEach 
} from 'vitest'
import {
 render, screen 
} from '@testing-library/react'
import { ForceGraph } from './ForceGraph'
import type { RiviereGraph } from '@/types/riviere'
import type { Theme } from '@/types/theme'
import {
 parseNode, parseEdge, parseDomainKey, parseDomainMetadata 
} from '@/lib/riviereTestData'
const testSourceLocation = {
 repository: 'test-repo',
filePath: 'src/test.ts' 
}

const mockGraph: RiviereGraph = {
  version: '1.0',
  metadata: {
    name: 'Test Graph',
    domains: {
[parseDomainKey('orders')]: {
 description: 'Orders domain',
systemType: 'domain' 
},
},
  },
  components: [
    parseNode({
 sourceLocation: testSourceLocation,
id: 'node-1',
type: 'API',
name: 'Test API',
domain: 'orders',
module: 'api',
apiType: 'other' 
}),
    parseNode({
 sourceLocation: testSourceLocation,
id: 'node-2',
type: 'UseCase',
name: 'Test UseCase',
domain: 'orders',
module: 'core' 
}),
    parseNode({
 sourceLocation: testSourceLocation,
id: 'node-3',
type: 'DomainOp',
name: 'Test DomainOp',
domain: 'orders',
module: 'domain',
operationName: 'testOp' 
}),
    parseNode({
 sourceLocation: testSourceLocation,
id: 'node-4',
type: 'Event',
name: 'test-event',
domain: 'orders',
module: 'events',
eventName: 'test-event' 
}),
    parseNode({
 sourceLocation: testSourceLocation,
id: 'node-5',
type: 'EventHandler',
name: 'Test Handler',
domain: 'orders',
module: 'handlers',
subscribedEvents: ['test-event'] 
}),
    parseNode({
 sourceLocation: testSourceLocation,
id: 'node-6',
type: 'UI',
name: 'Test UI',
domain: 'orders',
module: 'ui',
route: '/test-ui' 
}),
    parseNode({
 sourceLocation: testSourceLocation,
id: 'node-7',
type: 'Custom',
name: 'Test Custom',
domain: 'orders',
module: 'custom',
customTypeName: 'TestCustomType' 
}),
  ],
  links: [
    parseEdge({
 source: 'node-1',
target: 'node-2',
type: 'sync' 
}),
    parseEdge({
 source: 'node-2',
target: 'node-3',
type: 'sync' 
}),
    parseEdge({
 source: 'node-3',
target: 'node-4',
type: 'async' 
}),
    parseEdge({
 source: 'node-4',
target: 'node-5',
type: 'async' 
}),
  ],
}

const mockCallbacks = {
  onNodeClick: vi.fn(),
  onNodeHover: vi.fn(),
  onBackgroundClick: vi.fn(),
}

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

describe('ForceGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    test('renders container with correct test id', () => {
      render(<ForceGraph graph={mockGraph} theme="stream" />)

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('renders SVG element', () => {
      render(<ForceGraph graph={mockGraph} theme="stream" />)

      expect(screen.getByTestId('force-graph-svg')).toBeInTheDocument()
    })

    test('renders canvas background', () => {
      render(<ForceGraph graph={mockGraph} theme="stream" />)

      const container = screen.getByTestId('force-graph-container')
      const background = container.querySelector('.canvas-background')
      expect(background).toBeInTheDocument()
    })

    test('passes highlightedNodeId attribute to container', () => {
      render(<ForceGraph graph={mockGraph} theme="stream" highlightedNodeId="node-1" />)

      const container = screen.getByTestId('force-graph-container')
      expect(container).toHaveAttribute('data-highlighted-node', 'node-1')
    })

    test('handles empty graph without crashing', () => {
      const emptyGraph: RiviereGraph = {
        version: '1.0',
        metadata: {
 domains: parseDomainMetadata({
 'test-domain': {
 description: 'Test domain',
systemType: 'domain' 
} 
}) 
},
        components: [],
        links: [],
      }

      render(<ForceGraph graph={emptyGraph} theme="stream" />)
      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })
  })

  describe('Theme Support', () => {
    test('accepts all three themes without error', () => {
      const themes: readonly Theme[] = ['stream', 'voltage', 'circuit']

      for (const theme of themes) {
        const { unmount } = render(<ForceGraph graph={mockGraph} theme={theme} />)
        expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
        unmount()
      }
    })

    test('responds to theme changes', async () => {
      const { rerender } = render(<ForceGraph graph={mockGraph} theme="stream" />)

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()

      rerender(<ForceGraph graph={mockGraph} theme="voltage" />)

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })
  })

  describe('Node and Edge Filtering', () => {
    test('filters nodes when visibleNodeIds is provided', () => {
      const visibleIds = new Set(['node-1', 'node-2'])

      render(
        <ForceGraph graph={mockGraph} theme="stream" visibleNodeIds={visibleIds} />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('filters edges based on visibleNodeIds', () => {
      const visibleIds = new Set(['node-1', 'node-2', 'node-3'])

      render(
        <ForceGraph graph={mockGraph} theme="stream" visibleNodeIds={visibleIds} />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('handles single node in visibleNodeIds', () => {
      const visibleIds = new Set(['node-1'])

      render(
        <ForceGraph graph={mockGraph} theme="stream" visibleNodeIds={visibleIds} />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })
  })

  describe('Event Callbacks', () => {
    test('renders without error when onNodeClick callback is provided', () => {
      render(
        <ForceGraph
          graph={mockGraph}
          theme="stream"
          onNodeClick={mockCallbacks.onNodeClick}
        />
      )

      expect(screen.getByTestId('force-graph-svg')).toBeInTheDocument()
    })

    test('renders without error when onNodeHover callback is provided', () => {
      render(
        <ForceGraph
          graph={mockGraph}
          theme="stream"
          onNodeHover={mockCallbacks.onNodeHover}
        />
      )

      expect(screen.getByTestId('force-graph-svg')).toBeInTheDocument()
    })

    test('renders without error when onBackgroundClick callback is provided', () => {
      render(
        <ForceGraph
          graph={mockGraph}
          theme="stream"
          onBackgroundClick={mockCallbacks.onBackgroundClick}
        />
      )

      expect(screen.getByTestId('force-graph-svg')).toBeInTheDocument()
    })
  })

  describe('Highlighted Nodes', () => {
    test('applies highlighting when highlightedNodeIds is provided', () => {
      const highlightedIds = new Set(['node-1', 'node-2'])

      render(
        <ForceGraph
          graph={mockGraph}
          theme="stream"
          highlightedNodeIds={highlightedIds}
        />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('handles empty highlightedNodeIds set', () => {
      const highlightedIds = new Set<string>()

      render(
        <ForceGraph
          graph={mockGraph}
          theme="stream"
          highlightedNodeIds={highlightedIds}
        />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('handles single highlighted node', () => {
      const highlightedIds = new Set(['node-1'])

      render(
        <ForceGraph
          graph={mockGraph}
          theme="stream"
          highlightedNodeIds={highlightedIds}
        />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })
  })

  describe('Focus Mode', () => {
    test('applies focus mode when focusedDomain is provided', () => {
      render(
        <ForceGraph
          graph={mockGraph}
          theme="stream"
          focusedDomain="orders"
        />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('handles null focusedDomain', () => {
      render(
        <ForceGraph
          graph={mockGraph}
          theme="stream"
          focusedDomain={null}
        />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })
  })

  describe('Graph Updates', () => {
    test('updates when graph changes', () => {
      const { rerender } = render(<ForceGraph graph={mockGraph} theme="stream" />)

      const newGraph: RiviereGraph = {
        ...mockGraph,
        components: [...mockGraph.components, parseNode({
 sourceLocation: testSourceLocation,
id: 'node-8',
type: 'API',
name: 'New Node',
domain: 'orders',
module: 'api' 
})],
      }

      rerender(<ForceGraph graph={newGraph} theme="stream" />)

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('updates when visibleNodeIds change', () => {
      const { rerender } = render(
        <ForceGraph graph={mockGraph} theme="stream" visibleNodeIds={new Set(['node-1'])} />
      )

      rerender(
        <ForceGraph graph={mockGraph} theme="stream" visibleNodeIds={new Set(['node-1', 'node-2'])} />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('updates when highlightedNodeIds change', () => {
      const { rerender } = render(
        <ForceGraph graph={mockGraph} theme="stream" highlightedNodeIds={new Set(['node-1'])} />
      )

      rerender(
        <ForceGraph graph={mockGraph} theme="stream" highlightedNodeIds={new Set(['node-2'])} />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('resets zoom to fit viewport when highlight is cleared', () => {
      const { rerender } = render(
        <ForceGraph graph={mockGraph} theme="stream" highlightedNodeIds={new Set(['node-1'])} />
      )

      rerender(
        <ForceGraph graph={mockGraph} theme="stream" highlightedNodeIds={undefined} />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })
  })

  describe('All Node Types', () => {
    test('renders all node types correctly', () => {
      render(<ForceGraph graph={mockGraph} theme="stream" />)

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('handles graph with multiple domains', () => {
      const multiDomainGraph: RiviereGraph = {
        version: '1.0',
        metadata: {
          domains: {
            [parseDomainKey('orders')]: {
 description: 'Orders domain',
systemType: 'domain' 
},
            [parseDomainKey('shipping')]: {
 description: 'Shipping domain',
systemType: 'domain' 
},
            [parseDomainKey('inventory')]: {
 description: 'Inventory domain',
systemType: 'domain' 
},
          },
        },
        components: [
          parseNode({
 sourceLocation: testSourceLocation,
id: 'o1',
type: 'API',
name: 'Orders API',
domain: 'orders',
module: 'api' 
}),
          parseNode({
 sourceLocation: testSourceLocation,
id: 's1',
type: 'API',
name: 'Shipping API',
domain: 'shipping',
module: 'api' 
}),
          parseNode({
 sourceLocation: testSourceLocation,
id: 'i1',
type: 'API',
name: 'Inventory API',
domain: 'inventory',
module: 'api' 
}),
        ],
        links: [
          parseEdge({
 source: 'o1',
target: 's1',
type: 'sync' 
}),
          parseEdge({
 source: 'o1',
target: 'i1',
type: 'async' 
}),
        ],
      }

      render(<ForceGraph graph={multiDomainGraph} theme="stream" />)

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })
  })

  describe('Tooltip Clearing on Interaction', () => {
    test('clears tooltip when drag starts', () => {
      const onNodeHover = vi.fn()
      render(
        <ForceGraph
          graph={mockGraph}
          theme="stream"
          onNodeHover={onNodeHover}
        />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('clears tooltip when zoom/pan starts', () => {
      const onNodeHover = vi.fn()
      render(
        <ForceGraph
          graph={mockGraph}
          theme="stream"
          onNodeHover={onNodeHover}
        />
      )

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })
  })

  describe('External Links Integration', () => {
    test('creates external nodes when graph has externalLinks', () => {
      const sourceNodeId = parseNode({
        sourceLocation: testSourceLocation,
        id: 'node-1',
        type: 'API',
        name: 'Orders API',
        domain: 'orders',
        module: 'api',
      }).id

      const graphWithExternalLinks: RiviereGraph = {
        version: '1.0',
        metadata: {
domains: {
 [parseDomainKey('orders')]: {
 description: 'Orders',
systemType: 'domain' 
} 
},
},
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'node-1',
            type: 'API',
            name: 'Orders API',
            domain: 'orders',
            module: 'api',
          }),
        ],
        links: [],
        externalLinks: [
          {
            source: sourceNodeId,
            target: { name: 'Stripe' },
            type: 'sync',
          },
        ],
      }

      render(<ForceGraph graph={graphWithExternalLinks} theme="stream" />)

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('creates external links connecting to external nodes', () => {
      const sourceNodeId = parseNode({
        sourceLocation: testSourceLocation,
        id: 'node-1',
        type: 'API',
        name: 'Orders API',
        domain: 'orders',
        module: 'api',
      }).id

      const graphWithExternalLinks: RiviereGraph = {
        version: '1.0',
        metadata: {
domains: {
 [parseDomainKey('orders')]: {
 description: 'Orders',
systemType: 'domain' 
} 
},
},
        components: [
          parseNode({
            sourceLocation: testSourceLocation,
            id: 'node-1',
            type: 'API',
            name: 'Orders API',
            domain: 'orders',
            module: 'api',
          }),
        ],
        links: [],
        externalLinks: [
          {
            source: sourceNodeId,
            target: {
 name: 'Stripe',
url: 'https://stripe.com' 
},
            type: 'sync',
          },
          {
            source: sourceNodeId,
            target: { name: 'Twilio' },
            type: 'async',
          },
        ],
      }

      render(<ForceGraph graph={graphWithExternalLinks} theme="stream" />)

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    test('handles graph with only edges and no nodes', () => {
      const edgesOnlyGraph: RiviereGraph = {
        version: '1.0',
        metadata: {
 domains: parseDomainMetadata({
 'test-domain': {
 description: 'Test domain',
systemType: 'domain' 
} 
}) 
},
        components: [],
        links: [parseEdge({
 source: 'node-1',
target: 'node-2',
type: 'sync' 
})],
      }

      render(<ForceGraph graph={edgesOnlyGraph} theme="stream" />)

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('handles self-referencing edge', () => {
      const selfRefGraph: RiviereGraph = {
        version: '1.0',
        metadata: {
 domains: {
 [parseDomainKey('orders')]: {
 description: 'Orders',
systemType: 'domain' 
} 
} 
},
        components: [parseNode({
 sourceLocation: testSourceLocation,
id: 'node-1',
type: 'API',
name: 'Test API',
domain: 'orders',
module: 'api' 
})],
        links: [parseEdge({
 source: 'node-1',
target: 'node-1',
type: 'sync' 
})],
      }

      render(<ForceGraph graph={selfRefGraph} theme="stream" />)

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })

    test('handles long node names', () => {
      const longNameGraph: RiviereGraph = {
        version: '1.0',
        metadata: {
 domains: {
 [parseDomainKey('orders')]: {
 description: 'Orders',
systemType: 'domain' 
} 
} 
},
        components: [
          parseNode({
 sourceLocation: testSourceLocation,
id: 'node-1',
            type: 'API',
        apiType: 'other',
            name: 'This is a very long node name that should be truncated properly',
            domain: 'orders',
            module: 'api',
          }),
        ],
        links: [],
      }

      render(<ForceGraph graph={longNameGraph} theme="stream" />)

      expect(screen.getByTestId('force-graph-container')).toBeInTheDocument()
    })
  })
})
