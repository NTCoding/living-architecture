import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GraphTooltip } from './GraphTooltip'
import type { TooltipData, SimulationNode } from '../../types'
import { parseNode } from '@/lib/riviereTestData'
const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

const mockNode: SimulationNode = {
  id: 'test-node',
  type: 'API',
        apiType: 'other',
  name: 'Test API Node',
  domain: 'orders',
  originalNode: parseNode({
    sourceLocation: testSourceLocation,
    id: 'test-node',
    type: 'API',
        apiType: 'other',
    name: 'Test API Node',
    domain: 'orders',
    module: 'api',
  }),
}

const mockTooltipData: TooltipData = {
  node: mockNode,
  x: 100,
  y: 200,
  incomingCount: 3,
  outgoingCount: 5,
}

describe('GraphTooltip', () => {
  test('renders nothing when data is null', () => {
    const { container } = render(<GraphTooltip data={null} />)
    expect(container.firstChild).toBeNull()
  })

  test('renders tooltip when data is provided', () => {
    render(<GraphTooltip data={mockTooltipData} />)
    expect(screen.getByTestId('graph-tooltip')).toBeInTheDocument()
  })

  test('displays node name', () => {
    render(<GraphTooltip data={mockTooltipData} />)
    expect(screen.getByText('Test API Node')).toBeInTheDocument()
  })

  test('displays node type', () => {
    render(<GraphTooltip data={mockTooltipData} />)
    expect(screen.getByText('API')).toBeInTheDocument()
  })

  test('displays node domain', () => {
    render(<GraphTooltip data={mockTooltipData} />)
    expect(screen.getByText('orders')).toBeInTheDocument()
  })

  test('displays incoming edge count', () => {
    render(<GraphTooltip data={mockTooltipData} />)
    expect(screen.getByText(/3 edges/)).toBeInTheDocument()
  })

  test('displays outgoing edge count', () => {
    render(<GraphTooltip data={mockTooltipData} />)
    expect(screen.getByText(/5 edges/)).toBeInTheDocument()
  })

  test('uses singular "edge" for count of 1', () => {
    const dataWithOneEdge: TooltipData = {
      ...mockTooltipData,
      incomingCount: 1,
      outgoingCount: 1,
    }

    render(<GraphTooltip data={dataWithOneEdge} />)
    expect(screen.getAllByText(/1 edge$/)).toHaveLength(2)
  })

  test('positions tooltip based on x and y coordinates', () => {
    render(<GraphTooltip data={mockTooltipData} />)
    const tooltip = screen.getByTestId('graph-tooltip')

    expect(tooltip).toHaveStyle({ left: '110px', top: '190px' })
  })

  test('has tooltip role for accessibility', () => {
    render(<GraphTooltip data={mockTooltipData} />)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  test('displays click to trace flow hint', () => {
    render(<GraphTooltip data={mockTooltipData} />)
    expect(screen.getByText('Click to trace flow')).toBeInTheDocument()
  })

  test('shows code link when node has sourceLocation', () => {
    const nodeWithSource: SimulationNode = {
      id: 'node-with-source',
      type: 'API',
        apiType: 'other',
      name: 'API with Source',
      domain: 'orders',
      originalNode: parseNode({
        id: 'node-with-source',
        type: 'API',
        apiType: 'other',
        name: 'API with Source',
        domain: 'orders',
        module: 'api',
        sourceLocation: {
          repository: 'test-repo',
          filePath: 'src/api/orders.ts',
          lineNumber: 42,
        },
      }),
    }

    const dataWithSource: TooltipData = {
      ...mockTooltipData,
      node: nodeWithSource,
    }

    render(<GraphTooltip data={dataWithSource} />)
    expect(screen.getByText('src/api/orders.ts:42')).toBeInTheDocument()
  })

  test('does not show code link when node has no sourceLocation', () => {
    render(<GraphTooltip data={mockTooltipData} />)
    expect(screen.queryByTestId('code-link-path')).not.toBeInTheDocument()
  })
})
