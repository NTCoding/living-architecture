import {
  render, screen 
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  describe, expect, it 
} from 'vitest'
import { OrphanWarning } from './OrphanWarning'
import type { OrphanDetectionResult } from './OrphanWarning'
import {
  nodeIdSchema, domainNameSchema, moduleNameSchema, entityNameSchema, type Node
} from '@/platform/domain/eclair-types'

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'test.ts',
  lineNumber: 42,
}

function createAPINode(id: string, name: string): Node {
  return {
    id: nodeIdSchema.parse(id),
    type: 'API',
    name,
    apiType: 'REST',
    httpMethod: 'GET',
    path: '/',
    domain: domainNameSchema.parse('orders'),
    sourceLocation: testSourceLocation,
    module: moduleNameSchema.parse('api'),
  }
}

function createDomainOpNode(id: string, name: string): Node {
  return {
    id: nodeIdSchema.parse(id),
    type: 'DomainOp',
    name,
    operationName: 'test-op',
    entity: entityNameSchema.parse('TestEntity'),
    domain: domainNameSchema.parse('orders'),
    sourceLocation: testSourceLocation,
    module: moduleNameSchema.parse('api'),
  }
}

function createNode(id: string, name: string, type: Node['type'] = 'API'): Node {
  if (type === 'API') return createAPINode(id, name)
  if (type === 'DomainOp') return createDomainOpNode(id, name)
  return createAPINode(id, name)
}

describe('OrphanWarning', () => {
  it('does not render when no orphans detected', () => {
    const result: OrphanDetectionResult = {
      hasOrphans: false,
      orphanNodeIds: new Set(),
      orphanCount: 0,
    }
    const { container } = render(<OrphanWarning result={result} nodes={[]} />)

    expect(container.firstChild).toBeNull()
  })

  it('renders warning with plural text for multiple orphans', () => {
    const result: OrphanDetectionResult = {
      hasOrphans: true,
      orphanNodeIds: new Set(['node-1', 'node-2']),
      orphanCount: 2,
    }
    const nodes: Node[] = [createNode('node-1', 'Node 1'), createNode('node-2', 'Node 2')]

    render(<OrphanWarning result={result} nodes={nodes} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/2 nodes have no connections/)).toBeInTheDocument()
  })

  it('renders warning with singular text for one orphan', () => {
    const result: OrphanDetectionResult = {
      hasOrphans: true,
      orphanNodeIds: new Set(['node-1']),
      orphanCount: 1,
    }
    const nodes: Node[] = [createNode('node-1', 'Node 1')]

    render(<OrphanWarning result={result} nodes={nodes} />)

    expect(screen.getByText(/1 node has no connections/)).toBeInTheDocument()
  })

  it('renders warning icon', () => {
    const result: OrphanDetectionResult = {
      hasOrphans: true,
      orphanNodeIds: new Set(['node-1']),
      orphanCount: 1,
    }
    const nodes: Node[] = [createNode('node-1', 'Node 1')]
    const { container } = render(<OrphanWarning result={result} nodes={nodes} />)

    expect(container.querySelector('.ph-warning')).toBeInTheDocument()
  })

  it('opens modal when warning text is clicked', async () => {
    const user = userEvent.setup()
    const result: OrphanDetectionResult = {
      hasOrphans: true,
      orphanNodeIds: new Set(['node-1', 'node-2']),
      orphanCount: 2,
    }
    const nodes: Node[] = [createNode('node-1', 'Node 1'), createNode('node-2', 'Node 2')]

    render(<OrphanWarning result={result} nodes={nodes} />)

    await user.click(screen.getByText(/Click to view details/))

    expect(screen.getByText('Orphan Nodes (2)')).toBeInTheDocument()
    expect(screen.getByText('Node 1')).toBeInTheDocument()
    expect(screen.getByText('Node 2')).toBeInTheDocument()
  })

  it.each([
    {
      label: 'node name',
      expectedText: 'GET /users',
    },
    {
      label: 'node ID',
      expectedText: /ID: api-node/,
    },
    {
      label: 'node type',
      expectedText: /Type: API/,
    },
    {
      label: 'domain',
      expectedText: /Domain: orders/,
    },
    {
      label: 'source location',
      expectedText: /test.ts:42/,
    },
  ])('displays $label in orphan node modal', async ({ expectedText }) => {
    const user = userEvent.setup()
    const result: OrphanDetectionResult = {
      hasOrphans: true,
      orphanNodeIds: new Set(['api-node']),
      orphanCount: 1,
    }
    const nodes: Node[] = [createNode('api-node', 'GET /users', 'API')]

    render(<OrphanWarning result={result} nodes={nodes} />)

    await user.click(screen.getByText(/Click to view details/))

    expect(screen.getByText(expectedText)).toBeInTheDocument()
  })

  it('closes modal when close button is clicked', async () => {
    const user = userEvent.setup()
    const result: OrphanDetectionResult = {
      hasOrphans: true,
      orphanNodeIds: new Set(['node-1']),
      orphanCount: 1,
    }
    const nodes: Node[] = [createNode('node-1', 'Node 1')]

    render(<OrphanWarning result={result} nodes={nodes} />)

    await user.click(screen.getByText(/Click to view details/))
    expect(screen.getByText('Orphan Nodes (1)')).toBeInTheDocument()

    const closeButton = screen.getByLabelText('Close modal')
    await user.click(closeButton)

    expect(screen.queryByText('Orphan Nodes (1)')).not.toBeInTheDocument()
  })

  it('closes banner when close icon is clicked', async () => {
    const user = userEvent.setup()
    const result: OrphanDetectionResult = {
      hasOrphans: true,
      orphanNodeIds: new Set(['node-1']),
      orphanCount: 1,
    }
    const nodes: Node[] = [createNode('node-1', 'Node 1')]

    render(<OrphanWarning result={result} nodes={nodes} />)

    expect(screen.getByRole('alert')).toBeInTheDocument()

    const closeButton = screen.getByLabelText('Close orphan warning')
    await user.click(closeButton)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
