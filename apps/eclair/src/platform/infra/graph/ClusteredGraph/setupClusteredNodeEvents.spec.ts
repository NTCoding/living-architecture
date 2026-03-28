import * as d3 from 'd3'
import {
  describe, expect, it, vi 
} from 'vitest'
import {
  parseNode, parseEdge 
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import {
  createSimulationNodes,
  createSimulationLinks,
} from '../ForceGraph/VisualizationDataAdapters'
import { setupClusteredNodeEvents } from './setupClusteredNodeEvents'

const sourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

describe('setupClusteredNodeEvents', () => {
  function requireNode<T>(value: T | undefined, message: string): T {
    if (value === undefined) {
      throw new TypeError(message)
    }

    return value
  }

  it('wires click and hover handlers with link counts', () => {
    const onNodeClick = vi.fn()
    const onNodeHover = vi.fn()
    const nodes = createSimulationNodes([
      parseNode({
        sourceLocation,
        id: 'orders-api',
        type: 'API',
        name: 'Orders API',
        domain: 'orders',
        module: 'api',
      }),
      parseNode({
        sourceLocation,
        id: 'billing-worker',
        type: 'UseCase',
        name: 'Billing Worker',
        domain: 'billing',
        module: 'core',
      }),
    ])
    const links = createSimulationLinks([
      parseEdge({
        source: 'orders-api',
        target: 'billing-worker',
        type: 'sync',
      }),
    ])

    const svg = d3.select(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
    const node = svg.selectAll<SVGGElement, (typeof nodes)[number]>('g').data(nodes).join('g')

    setupClusteredNodeEvents({
      node,
      links,
      onNodeClick,
      onNodeHover,
    })

    const firstNode = requireNode(node.nodes()[0], 'Missing first node')

    const clickEvent = new MouseEvent('click', { bubbles: true })
    firstNode.dispatchEvent(clickEvent)

    const hoverEvent = new MouseEvent('mouseenter', { bubbles: true })
    Object.defineProperty(hoverEvent, 'pageX', { value: 120 })
    Object.defineProperty(hoverEvent, 'pageY', { value: 240 })
    firstNode.dispatchEvent(hoverEvent)
    firstNode.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }))

    expect(onNodeClick).toHaveBeenCalledWith('orders-api')
    expect(onNodeHover).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        x: 120,
        y: 240,
        incomingCount: 0,
        outgoingCount: 1,
      }),
    )
    expect(onNodeHover).toHaveBeenNthCalledWith(2, null)
  })
})
