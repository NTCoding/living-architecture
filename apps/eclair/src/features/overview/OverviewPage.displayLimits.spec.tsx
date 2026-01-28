import {
  describe, it, expect 
} from 'vitest'
import {
  render, screen 
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OverviewPage } from './entrypoint/OverviewPage'
import type { RiviereGraph } from '@living-architecture/riviere-schema'
import {
  parseNode, parseDomainMetadata 
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

function renderWithRouter(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

function createTestGraph(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'Test Architecture',
      description: 'Test description',
      domains: parseDomainMetadata({
        'order-domain': {
          description: 'Order management',
          systemType: 'domain',
        },
      }),
    },
    components: [
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'n4',
        type: 'DomainOp',
        name: 'Order.begin',
        domain: 'order-domain',
        module: 'm1',
        entity: 'Order',
        operationName: 'begin',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'n7',
        type: 'DomainOp',
        name: 'Payment.authorize',
        domain: 'order-domain',
        module: 'm1',
        entity: 'Payment',
        operationName: 'authorize',
      }),
    ],
    links: [],
  }
}

function createGraphWithManyItems(): RiviereGraph {
  return {
    version: '1.0',
    metadata: {
      name: 'Test Architecture',
      description: 'Test description',
      domains: parseDomainMetadata({
        'large-domain': {
          description: 'Domain with many entities',
          systemType: 'domain',
        },
      }),
    },
    components: [
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'n1',
        type: 'DomainOp',
        name: 'Entity1.op',
        domain: 'large-domain',
        module: 'm1',
        entity: 'Entity1',
        operationName: 'op',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'n2',
        type: 'DomainOp',
        name: 'Entity2.op',
        domain: 'large-domain',
        module: 'm1',
        entity: 'Entity2',
        operationName: 'op',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'n3',
        type: 'DomainOp',
        name: 'Entity3.op',
        domain: 'large-domain',
        module: 'm1',
        entity: 'Entity3',
        operationName: 'op',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'n4',
        type: 'DomainOp',
        name: 'Entity4.op',
        domain: 'large-domain',
        module: 'm1',
        entity: 'Entity4',
        operationName: 'op',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'n5',
        type: 'DomainOp',
        name: 'Entity5.op',
        domain: 'large-domain',
        module: 'm1',
        entity: 'Entity5',
        operationName: 'op',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'ep1',
        type: 'UI',
        name: '/page1',
        domain: 'large-domain',
        module: 'm1',
        route: '/page1',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'ep2',
        type: 'UI',
        name: '/page2',
        domain: 'large-domain',
        module: 'm1',
        route: '/page2',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'ep3',
        type: 'API',
        name: 'API 3',
        domain: 'large-domain',
        module: 'm1',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/api/3',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'ep4',
        type: 'API',
        name: 'API 4',
        domain: 'large-domain',
        module: 'm1',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/api/4',
      }),
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'ep5',
        type: 'API',
        name: 'API 5',
        domain: 'large-domain',
        module: 'm1',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/api/5',
      }),
    ],
    links: [],
  }
}

describe('OverviewPage - Item display limits', () => {
  it('limits entities display to 3 items when domain has more', () => {
    const graph = createGraphWithManyItems()

    renderWithRouter(<OverviewPage graph={graph} />)

    ;['Entity1', 'Entity2', 'Entity3'].forEach((entity) => {
      expect(screen.getByText(entity)).toBeInTheDocument()
    })
    ;['Entity4', 'Entity5'].forEach((entity) => {
      expect(screen.queryByText(entity)).not.toBeInTheDocument()
    })
  })

  it('shows ellipsis indicator when entities exceed limit', () => {
    const graph = createGraphWithManyItems()

    renderWithRouter(<OverviewPage graph={graph} />)

    const ellipsisIndicators = screen.getAllByText('…')
    expect(ellipsisIndicators).toHaveLength(2)
  })

  it('limits entry points display to 3 items when domain has more', () => {
    const graph = createGraphWithManyItems()

    renderWithRouter(<OverviewPage graph={graph} />)

    ;['/page1', '/page2', '/api/3'].forEach((path) => {
      expect(screen.getByText(path)).toBeInTheDocument()
    })
    ;['/api/4', '/api/5'].forEach((path) => {
      expect(screen.queryByText(path)).not.toBeInTheDocument()
    })
  })

  it('shows ellipsis indicator for entry points when exceeding limit', () => {
    const graph = createGraphWithManyItems()

    renderWithRouter(<OverviewPage graph={graph} />)

    const ellipsisIndicators = screen.getAllByText('…')
    expect(ellipsisIndicators).toHaveLength(2)
  })

  it('shows all entities without ellipsis when count is 3 or less', () => {
    const graph = createTestGraph()

    renderWithRouter(<OverviewPage graph={graph} />)

    expect(screen.getByText('Order')).toBeInTheDocument()
    expect(screen.getByText('Payment')).toBeInTheDocument()
    expect(screen.queryByText('…')).not.toBeInTheDocument()
  })

  it('truncates long entity names to prevent overflow', () => {
    const graph = createTestGraph()
    graph.components.push(
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'op:long-entity',
        type: 'DomainOp',
        name: 'Create Very Long Entity',
        domain: 'order-domain',
        module: 'core',
        entity: 'VeryLongEntityNameThatShouldBeTruncated',
        operationName: 'create',
      }),
    )

    renderWithRouter(<OverviewPage graph={graph} />)

    const entityBadge = screen.getByText('VeryLongEntityNameThatShouldBeTruncated')
    expect(entityBadge).toHaveClass('truncate')
  })

  it('truncates long entry point paths to prevent overflow', () => {
    const graph = createTestGraph()
    graph.components.push(
      parseNode({
        sourceLocation: testSourceLocation,
        id: 'api:long-path',
        type: 'API',
        name: 'Long Path API',
        domain: 'order-domain',
        module: 'api',
        apiType: 'REST',
        httpMethod: 'GET',
        path: '/api/v1/orders/very/long/path/that/should/be/truncated',
      }),
    )

    renderWithRouter(<OverviewPage graph={graph} />)

    const pathElement = screen.getByText('/api/v1/orders/very/long/path/that/should/be/truncated')
    expect(pathElement).toHaveClass('truncate')
  })
})
