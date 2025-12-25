import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FlowGraphView } from './FlowGraphView'
import { parseNode, parseEdge, parseDomainMetadata } from '@/lib/riviereTestData'
import type { FlowStep } from '../../extractFlows'
import type { RiviereGraph } from '@/types/riviere'
const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'stream' }),
}))

vi.mock('@/features/full-graph/components/ForceGraph', () => ({
  ForceGraph: ({ graph }: { graph: { components: Array<{ name: string }> } }) => (
    <div data-testid="force-graph-mock">
      {graph.components.map((node) => (
        <span key={node.name}>{node.name}</span>
      ))}
    </div>
  ),
}))

function createTestSteps(): FlowStep[] {
  return [
    {
      node: parseNode({ sourceLocation: testSourceLocation, id: 'ui-1', type: 'UI', name: 'Order Form', domain: 'checkout', module: 'ui', route: '/orders' }),
      edgeType: 'sync',
      depth: 0,
    },
    {
      node: parseNode({ sourceLocation: testSourceLocation, id: 'api-1', type: 'API', name: 'POST /orders', domain: 'orders', module: 'api', httpMethod: 'POST', path: '/orders' }),
      edgeType: null,
      depth: 1,
    },
  ]
}

function createTestGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: { domains: parseDomainMetadata({ 'test-domain': { description: 'Test domain', systemType: 'domain' } }) },
    components: [
      parseNode({ sourceLocation: testSourceLocation, id: 'ui-1', type: 'UI', name: 'Order Form', domain: 'checkout', module: 'ui', route: '/orders' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'api-1', type: 'API', name: 'POST /orders', domain: 'orders', module: 'api', httpMethod: 'POST', path: '/orders' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'other-node', type: 'UseCase', name: 'Other', domain: 'other', module: 'other' }),
    ],
    links: [
      parseEdge({ source: 'ui-1', target: 'api-1', type: 'sync' }),
      parseEdge({ source: 'api-1', target: 'other-node', type: 'sync' }),
    ],
  }
}

describe('FlowGraphView', () => {
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
})
