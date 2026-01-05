import {
 describe, it, expect 
} from 'vitest'
import {
 render, screen 
} from '@testing-library/react'
import { StatsBar } from './StatsBar'
import type { GraphDiff } from './compareGraphs'

interface NodeStats {
  nodesAdded: number
  nodesRemoved: number
  nodesModified: number
  nodesUnchanged: number
}

function createMockDiff(stats: NodeStats): GraphDiff {
  return {
    nodes: {
 added: [],
removed: [],
modified: [],
unchanged: [] 
},
    edges: {
 added: [],
removed: [],
modified: [],
unchanged: [] 
},
    stats: {
      ...stats,
      edgesAdded: 0,
      edgesRemoved: 0,
      edgesModified: 0,
      edgesUnchanged: 0,
    },
    byDomain: {},
    byNodeType: {},
  }
}

describe('StatsBar', () => {
  it('displays added nodes count', () => {
    const diff = createMockDiff({
 nodesAdded: 5,
nodesRemoved: 0,
nodesModified: 0,
nodesUnchanged: 0 
})
    render(<StatsBar diff={diff} />)

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Added')).toBeInTheDocument()
  })

  it('displays removed nodes count', () => {
    const diff = createMockDiff({
 nodesAdded: 0,
nodesRemoved: 3,
nodesModified: 0,
nodesUnchanged: 0 
})
    render(<StatsBar diff={diff} />)

    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Removed')).toBeInTheDocument()
  })

  it('displays modified nodes count', () => {
    const diff = createMockDiff({
 nodesAdded: 0,
nodesRemoved: 0,
nodesModified: 7,
nodesUnchanged: 0 
})
    render(<StatsBar diff={diff} />)

    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('Modified')).toBeInTheDocument()
  })

  it('displays unchanged nodes count', () => {
    const diff = createMockDiff({
 nodesAdded: 0,
nodesRemoved: 0,
nodesModified: 0,
nodesUnchanged: 42 
})
    render(<StatsBar diff={diff} />)

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Unchanged')).toBeInTheDocument()
  })

  it('displays all stats together', () => {
    const diff = createMockDiff({
 nodesAdded: 10,
nodesRemoved: 5,
nodesModified: 3,
nodesUnchanged: 100 
})
    render(<StatsBar diff={diff} />)

    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('renders icons with aria-hidden for accessibility', () => {
    const diff = createMockDiff({
 nodesAdded: 1,
nodesRemoved: 1,
nodesModified: 1,
nodesUnchanged: 1 
})
    const { container } = render(<StatsBar diff={diff} />)

    const icons = container.querySelectorAll('i[aria-hidden="true"]')
    expect(icons).toHaveLength(4)
  })
})
