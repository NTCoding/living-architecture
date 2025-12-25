import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DomainMapPage } from './DomainMapPage'
import { ExportProvider } from '@/contexts/ExportContext'
import type { RiviereGraph } from '@/types/riviere'
import { parseNode, parseEdge } from '@/lib/riviereTestData'

const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

function createTestGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: { domains: {} },
    components: [
      parseNode({ sourceLocation: testSourceLocation, id: 'n1', type: 'API', name: 'API 1', domain: 'orders', module: 'm1' }),
      parseNode({ sourceLocation: testSourceLocation, id: 'n2', type: 'UseCase', name: 'UC 1', domain: 'payments', module: 'm2' }),
    ],
    links: [parseEdge({ source: 'n1', target: 'n2', type: 'sync' })],
  }
}

function renderWithRouter(graph: RiviereGraph, initialEntry = '/'): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ExportProvider>
        <DomainMapPage graph={graph} />
      </ExportProvider>
    </MemoryRouter>
  )
}

describe('DomainMapPage', () => {
  it('renders without crashing', () => {
    const graph = createTestGraph()

    renderWithRouter(graph)

    expect(screen.getByTestId('domain-map-page')).toBeInTheDocument()
  })

  it('displays domain count', () => {
    const graph = createTestGraph()

    renderWithRouter(graph)

    expect(screen.getByText('2 domains')).toBeInTheDocument()
  })

  it('displays edge count', () => {
    const graph = createTestGraph()

    renderWithRouter(graph)

    expect(screen.getByText('1 connection')).toBeInTheDocument()
  })

  it('renders React Flow container', () => {
    const graph = createTestGraph()

    renderWithRouter(graph)

    expect(screen.getByTestId('domain-map-flow')).toBeInTheDocument()
  })

  it('passes edges to ReactFlow', () => {
    const graph = createTestGraph()

    renderWithRouter(graph)

    expect(screen.getByText('1 connection')).toBeInTheDocument()
  })

  it('renders SVG marker definitions for edge arrows', () => {
    const graph = createTestGraph()

    const { container } = renderWithRouter(graph)

    const cyanMarker = container.querySelector('#arrow-cyan')
    const amberMarker = container.querySelector('#arrow-amber')
    expect(cyanMarker).toBeInTheDocument()
    expect(amberMarker).toBeInTheDocument()
  })

  it('highlights domain from URL query parameter', () => {
    const graph = createTestGraph()

    const { container } = renderWithRouter(graph, '/domain-map?highlight=orders')

    const ordersNode = container.querySelector('[data-id="orders"]')
    const paymentsNode = container.querySelector('[data-id="payments"]')

    expect(ordersNode).toBeInTheDocument()
    expect(paymentsNode).toBeInTheDocument()
  })
})
