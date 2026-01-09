import {
  describe, it, expect 
} from 'vitest'
import * as d3 from 'd3'
import { updateHighlight } from './GraphRenderingSetup'
import type {
  SimulationNode, SimulationLink 
} from '../../types'
import {
  parseNode, parseEdge 
} from '@/lib/riviereTestFixtures'

const testSourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

function createTestElements(): {
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  nodeGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  linkGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  cleanup: () => void
} {
  const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  document.body.appendChild(svgElement)
  const svg = d3.select(svgElement)
  const nodeGroup = svg.append('g').attr('class', 'nodes')
  const linkGroup = svg.append('g').attr('class', 'links')
  return {
    svg,
    nodeGroup,
    linkGroup,
    cleanup: () => svgElement.remove(),
  }
}

describe('GraphRenderingSetup - updateHighlight', () => {
  it('resets all nodes to full opacity when highlightedNodeIds is undefined', () => {
    const {
      nodeGroup, linkGroup, cleanup 
    } = createTestElements()
    const testNode: SimulationNode = {
      id: '1',
      type: 'API',
      name: 'test',
      domain: 'test',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'test',
        domain: 'test',
        module: 'test',
      }),
    }
    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, SimulationNode>('g')
      .data([testNode])
      .join('g')
      .attr('opacity', 0.2)
    const emptyLinks: SimulationLink[] = []
    const linkSelection = linkGroup
      .selectAll<SVGPathElement, SimulationLink>('path')
      .data(emptyLinks)
      .join('path')

    updateHighlight({
      node: nodeSelection,
      link: linkSelection,
      filteredEdges: [],
      highlightedNodeIds: undefined,
    })

    expect(nodeSelection.attr('opacity')).toBe('1')
    cleanup()
  })

  it('resets all links to default opacity when highlightedNodeIds is undefined', () => {
    const {
      nodeGroup, linkGroup, cleanup 
    } = createTestElements()
    const testNode: SimulationNode = {
      id: '1',
      type: 'API',
      name: 'test',
      domain: 'test',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'test',
        domain: 'test',
        module: 'test',
      }),
    }
    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, SimulationNode>('g')
      .data([testNode])
      .join('g')
    const testLink: SimulationLink = {
      source: '1',
      target: '2',
      type: 'sync',
      originalEdge: parseEdge({
        source: '1',
        target: '2',
        type: 'sync',
      }),
    }
    const linkSelection = linkGroup
      .selectAll<SVGPathElement, SimulationLink>('path')
      .data([testLink])
      .join('path')
      .attr('opacity', 0.1)

    updateHighlight({
      node: nodeSelection,
      link: linkSelection,
      filteredEdges: [],
      highlightedNodeIds: undefined,
    })

    expect(linkSelection.attr('opacity')).toBe('0.6')
    cleanup()
  })

  it('resets nodes when highlightedNodeIds is empty set', () => {
    const {
      nodeGroup, linkGroup, cleanup 
    } = createTestElements()
    const testNode: SimulationNode = {
      id: '1',
      type: 'API',
      name: 'test',
      domain: 'test',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: '1',
        type: 'API',
        name: 'test',
        domain: 'test',
        module: 'test',
      }),
    }
    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, SimulationNode>('g')
      .data([testNode])
      .join('g')
      .attr('opacity', 0.2)
    const emptyLinks: SimulationLink[] = []
    const linkSelection = linkGroup
      .selectAll<SVGPathElement, SimulationLink>('path')
      .data(emptyLinks)
      .join('path')

    updateHighlight({
      node: nodeSelection,
      link: linkSelection,
      filteredEdges: [],
      highlightedNodeIds: new Set(),
    })

    expect(nodeSelection.attr('opacity')).toBe('1')
    cleanup()
  })

  it('dims nodes outside highlighted flow when highlightedNodeIds contains a node ID', () => {
    const {
      nodeGroup, linkGroup, cleanup 
    } = createTestElements()

    const nodeA: SimulationNode = {
      id: 'a',
      type: 'API',
      name: 'A',
      domain: 'test',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: 'a',
        type: 'API',
        name: 'A',
        domain: 'test',
        module: 'test',
      }),
    }
    const nodeB: SimulationNode = {
      id: 'b',
      type: 'UseCase',
      name: 'B',
      domain: 'test',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: 'b',
        type: 'UseCase',
        name: 'B',
        domain: 'test',
        module: 'test',
      }),
    }
    const nodeC: SimulationNode = {
      id: 'c',
      type: 'Event',
      name: 'C',
      domain: 'test',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: 'c',
        type: 'Event',
        name: 'C',
        domain: 'test',
        module: 'test',
        eventName: 'C',
      }),
    }
    const nodeX: SimulationNode = {
      id: 'x',
      type: 'API',
      name: 'X',
      domain: 'other',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: 'x',
        type: 'API',
        name: 'X',
        domain: 'other',
        module: 'other',
      }),
    }

    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, SimulationNode>('g')
      .data([nodeA, nodeB, nodeC, nodeX])
      .join('g')

    const emptyLinks: SimulationLink[] = []
    const linkSelection = linkGroup
      .selectAll<SVGPathElement, SimulationLink>('path')
      .data(emptyLinks)
      .join('path')

    const edges = [
      parseEdge({
        source: 'a',
        target: 'b',
        type: 'sync',
      }),
      parseEdge({
        source: 'b',
        target: 'c',
        type: 'sync',
      }),
    ]

    updateHighlight({
      node: nodeSelection,
      link: linkSelection,
      filteredEdges: edges,
      highlightedNodeIds: new Set(['b']),
    })

    const opacities = nodeSelection.nodes().map((n) => n.getAttribute('opacity'))
    expect(opacities).toStrictEqual(['1', '1', '1', '0.2'])
    cleanup()
  })

  it('dims edges outside highlighted flow when highlightedNodeIds contains a node ID', () => {
    const {
      nodeGroup, linkGroup, cleanup 
    } = createTestElements()

    const nodeA: SimulationNode = {
      id: 'a',
      type: 'API',
      name: 'A',
      domain: 'test',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: 'a',
        type: 'API',
        name: 'A',
        domain: 'test',
        module: 'test',
      }),
    }
    const nodeB: SimulationNode = {
      id: 'b',
      type: 'UseCase',
      name: 'B',
      domain: 'test',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: 'b',
        type: 'UseCase',
        name: 'B',
        domain: 'test',
        module: 'test',
      }),
    }
    const nodeX: SimulationNode = {
      id: 'x',
      type: 'API',
      name: 'X',
      domain: 'other',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: 'x',
        type: 'API',
        name: 'X',
        domain: 'other',
        module: 'other',
      }),
    }
    const nodeY: SimulationNode = {
      id: 'y',
      type: 'API',
      name: 'Y',
      domain: 'other',
      originalNode: parseNode({
        sourceLocation: testSourceLocation,
        id: 'y',
        type: 'API',
        name: 'Y',
        domain: 'other',
        module: 'other',
      }),
    }

    const nodeSelection = nodeGroup
      .selectAll<SVGGElement, SimulationNode>('g')
      .data([nodeA, nodeB, nodeX, nodeY])
      .join('g')

    const linkAB: SimulationLink = {
      source: 'a',
      target: 'b',
      type: 'sync',
      originalEdge: parseEdge({
        source: 'a',
        target: 'b',
        type: 'sync',
      }),
    }
    const linkXY: SimulationLink = {
      source: 'x',
      target: 'y',
      type: 'sync',
      originalEdge: parseEdge({
        source: 'x',
        target: 'y',
        type: 'sync',
      }),
    }

    const linkSelection = linkGroup
      .selectAll<SVGPathElement, SimulationLink>('path')
      .data([linkAB, linkXY])
      .join('path')

    const edges = [
      parseEdge({
        source: 'a',
        target: 'b',
        type: 'sync',
      }),
      parseEdge({
        source: 'x',
        target: 'y',
        type: 'sync',
      }),
    ]

    updateHighlight({
      node: nodeSelection,
      link: linkSelection,
      filteredEdges: edges,
      highlightedNodeIds: new Set(['b']),
    })

    const opacities = linkSelection.nodes().map((n) => n.getAttribute('opacity'))
    expect(opacities).toStrictEqual(['0.8', '0.1'])
    cleanup()
  })
})
