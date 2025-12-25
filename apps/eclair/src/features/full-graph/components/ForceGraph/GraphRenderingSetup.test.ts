import { describe, it, expect, vi } from 'vitest'
import * as d3 from 'd3'
import {
  extractCoordinates,
  calculateFitViewportTransform,
  calculateFocusModeZoom,
  applyDagrePositions,
  setupZoomBehavior,
  updateHighlight,
} from './GraphRenderingSetup'
import type { SimulationNode, SimulationLink } from '../../types'
import { parseNode, parseEdge } from '@/lib/riviereTestData'
const testSourceLocation = { repository: 'test-repo', filePath: 'src/test.ts' }

describe('GraphRenderingSetup', () => {
  describe('extractCoordinates', () => {
    it('returns x coordinates when field is x', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }), x: 10, y: 20 },
        { id: '2', type: 'API', name: 'test2', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '2', type: 'API', name: 'test2', domain: 'test', module: 'test' }), x: 30, y: 40 },
      ]

      const result = extractCoordinates(nodes, 'x')

      expect(result).toEqual([10, 30])
    })

    it('returns y coordinates when field is y', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }), x: 10, y: 20 },
        { id: '2', type: 'API', name: 'test2', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '2', type: 'API', name: 'test2', domain: 'test', module: 'test' }), x: 30, y: 40 },
      ]

      const result = extractCoordinates(nodes, 'y')

      expect(result).toEqual([20, 40])
    })

    it('throws error when x coordinate is undefined', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }), y: 20 },
      ]

      expect(() => extractCoordinates(nodes, 'x')).toThrow('missing layout x coordinate')
    })

    it('throws error when y coordinate is undefined', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }), x: 10 },
      ]

      expect(() => extractCoordinates(nodes, 'y')).toThrow('missing layout y coordinate')
    })

    it('handles multiple nodes with coordinates', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }), x: 5, y: 15 },
        { id: '2', type: 'UseCase', name: 'test2', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '2', type: 'UseCase', name: 'test2', domain: 'test', module: 'test' }), x: 25, y: 35 },
        { id: '3', type: 'Event', name: 'test3', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '3', type: 'Event', name: 'test3', domain: 'test', module: 'test', eventName: 'test3' }), x: 45, y: 55 },
      ]

      expect(extractCoordinates(nodes, 'x')).toEqual([5, 25, 45])
      expect(extractCoordinates(nodes, 'y')).toEqual([15, 35, 55])
    })

    it('handles single node', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }), x: 100, y: 200 },
      ]

      expect(extractCoordinates(nodes, 'x')).toEqual([100])
      expect(extractCoordinates(nodes, 'y')).toEqual([200])
    })
  })

  describe('calculateFitViewportTransform', () => {
    it('returns identity transform for empty nodes', () => {
      const result = calculateFitViewportTransform({
        nodes: [],
        dimensions: { width: 800, height: 600 },
        padding: 80,
      })

      expect(result).toEqual({ translateX: 0, translateY: 0, scale: 1 })
    })

    it('centers single node in viewport', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }), x: 100, y: 100 },
      ]

      const result = calculateFitViewportTransform({
        nodes,
        dimensions: { width: 800, height: 600 },
        padding: 80,
      })

      expect(result.scale).toBeLessThanOrEqual(1)
      expect(result.translateX).toBeDefined()
      expect(result.translateY).toBeDefined()
    })

    it('fits multiple nodes with applied padding', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test1', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test1', domain: 'test', module: 'test' }), x: 0, y: 0 },
        { id: '2', type: 'API', name: 'test2', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '2', type: 'API', name: 'test2', domain: 'test', module: 'test' }), x: 100, y: 100 },
      ]

      const result = calculateFitViewportTransform({
        nodes,
        dimensions: { width: 800, height: 600 },
        padding: 80,
      })

      expect(result.scale).toBeGreaterThan(0)
      expect(result.scale).toBeLessThanOrEqual(1)
    })

    it('respects max scale of 1', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }), x: 10, y: 10 },
      ]

      const result = calculateFitViewportTransform({
        nodes,
        dimensions: { width: 1000, height: 1000 },
        padding: 10,
      })

      expect(result.scale).toBeLessThanOrEqual(1)
    })
  })

  describe('calculateFocusModeZoom', () => {
    it('returns null when no nodes in focused domain', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'orders', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'orders', module: 'test' }), x: 100, y: 100 },
      ]

      const result = calculateFocusModeZoom({
        nodes,
        focusedDomain: 'payments',
        dimensions: { width: 800, height: 600 },
      })

      expect(result).toBeNull()
    })

    it('calculates zoom to focus on domain nodes', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test1', domain: 'payments', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test1', domain: 'payments', module: 'test' }), x: 0, y: 0 },
        { id: '2', type: 'API', name: 'test2', domain: 'payments', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '2', type: 'API', name: 'test2', domain: 'payments', module: 'test' }), x: 100, y: 100 },
        { id: '3', type: 'API', name: 'test3', domain: 'orders', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '3', type: 'API', name: 'test3', domain: 'orders', module: 'test' }), x: 500, y: 500 },
      ]

      const result = calculateFocusModeZoom({
        nodes,
        focusedDomain: 'payments',
        dimensions: { width: 800, height: 600 },
      })

      expect(result).not.toBeNull()
      expect(result?.scale).toBeGreaterThan(0)
      expect(result?.scale).toBeLessThanOrEqual(2.5)
      expect(result?.translateX).toBeDefined()
      expect(result?.translateY).toBeDefined()
    })

    it('caps zoom scale at 2.5', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'payments', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'payments', module: 'test' }), x: 50, y: 50 },
      ]

      const result = calculateFocusModeZoom({
        nodes,
        focusedDomain: 'payments',
        dimensions: { width: 800, height: 600 },
      })

      expect(result?.scale).toBeLessThanOrEqual(2.5)
    })
  })

  describe('applyDagrePositions', () => {
    it('applies positions from map to nodes', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test1', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test1', domain: 'test', module: 'test' }) },
        { id: '2', type: 'API', name: 'test2', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '2', type: 'API', name: 'test2', domain: 'test', module: 'test' }) },
      ]

      const positions = new Map([
        ['1', { x: 100, y: 200 }],
        ['2', { x: 300, y: 400 }],
      ])

      applyDagrePositions({ nodes, positions })

      expect(nodes[0]?.x).toBe(100)
      expect(nodes[0]?.y).toBe(200)
      expect(nodes[1]?.x).toBe(300)
      expect(nodes[1]?.y).toBe(400)
    })

    it('skips nodes without positions in map', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test1', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test1', domain: 'test', module: 'test' }) },
        { id: '2', type: 'API', name: 'test2', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '2', type: 'API', name: 'test2', domain: 'test', module: 'test' }) },
      ]

      const positions = new Map([
        ['1', { x: 100, y: 200 }],
      ])

      applyDagrePositions({ nodes, positions })

      expect(nodes[0]?.x).toBe(100)
      expect(nodes[0]?.y).toBe(200)
      expect(nodes[1]?.x).toBeUndefined()
      expect(nodes[1]?.y).toBeUndefined()
    })

    it('handles empty positions map', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }) },
      ]

      const positions = new Map()

      applyDagrePositions({ nodes, positions })

      expect(nodes[0]?.x).toBeUndefined()
      expect(nodes[0]?.y).toBeUndefined()
    })

    it('overwrites existing positions', () => {
      const nodes: SimulationNode[] = [
        { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }), x: 10, y: 20 },
      ]

      const positions = new Map([
        ['1', { x: 100, y: 200 }],
      ])

      applyDagrePositions({ nodes, positions })

      expect(nodes[0]?.x).toBe(100)
      expect(nodes[0]?.y).toBe(200)
    })
  })

  describe('setupZoomBehavior', () => {
    function createTestSvgAndGroup(): {
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
      g: d3.Selection<SVGGElement, unknown, null, undefined>
    } {
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      document.body.appendChild(svgElement)
      const svg = d3.select(svgElement)
      const g = svg.append('g')
      return { svg, g }
    }

    it('accepts onInteractionStart option without throwing', () => {
      const { svg, g } = createTestSvgAndGroup()
      const onInteractionStart = vi.fn()

      expect(() => setupZoomBehavior(svg, g, { onInteractionStart })).not.toThrow()

      svg.node()?.remove()
    })

    it('works without options parameter', () => {
      const { svg, g } = createTestSvgAndGroup()

      expect(() => setupZoomBehavior(svg, g)).not.toThrow()

      svg.node()?.remove()
    })

    it('returns a zoom behavior object', () => {
      const { svg, g } = createTestSvgAndGroup()

      const zoom = setupZoomBehavior(svg, g)

      expect(zoom).toBeDefined()
      expect(zoom.scaleExtent).toBeDefined()

      svg.node()?.remove()
    })
  })

  describe('updateHighlight', () => {
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
      return { svg, nodeGroup, linkGroup, cleanup: () => svgElement.remove() }
    }

    it('resets all nodes to full opacity when highlightedNodeIds is undefined', () => {
      const { nodeGroup, linkGroup, cleanup } = createTestElements()
      const testNode: SimulationNode = { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }) }
      const nodeSelection = nodeGroup.selectAll<SVGGElement, SimulationNode>('g').data([testNode]).join('g').attr('opacity', 0.2)
      const emptyLinks: SimulationLink[] = []
      const linkSelection = linkGroup.selectAll<SVGPathElement, SimulationLink>('path').data(emptyLinks).join('path')

      updateHighlight({ node: nodeSelection, link: linkSelection, filteredEdges: [], highlightedNodeIds: undefined })

      expect(nodeSelection.attr('opacity')).toBe('1')
      cleanup()
    })

    it('resets all links to default opacity when highlightedNodeIds is undefined', () => {
      const { nodeGroup, linkGroup, cleanup } = createTestElements()
      const testNode: SimulationNode = { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }) }
      const nodeSelection = nodeGroup.selectAll<SVGGElement, SimulationNode>('g').data([testNode]).join('g')
      const testLink: SimulationLink = { source: '1', target: '2', type: 'sync', originalEdge: parseEdge({ source: '1', target: '2', type: 'sync' }) }
      const linkSelection = linkGroup.selectAll<SVGPathElement, SimulationLink>('path').data([testLink]).join('path').attr('opacity', 0.1)

      updateHighlight({ node: nodeSelection, link: linkSelection, filteredEdges: [], highlightedNodeIds: undefined })

      expect(linkSelection.attr('opacity')).toBe('0.6')
      cleanup()
    })

    it('resets nodes when highlightedNodeIds is empty set', () => {
      const { nodeGroup, linkGroup, cleanup } = createTestElements()
      const testNode: SimulationNode = { id: '1', type: 'API', name: 'test', domain: 'test', originalNode: parseNode({ sourceLocation: testSourceLocation, id: '1', type: 'API', name: 'test', domain: 'test', module: 'test' }) }
      const nodeSelection = nodeGroup.selectAll<SVGGElement, SimulationNode>('g').data([testNode]).join('g').attr('opacity', 0.2)
      const emptyLinks: SimulationLink[] = []
      const linkSelection = linkGroup.selectAll<SVGPathElement, SimulationLink>('path').data(emptyLinks).join('path')

      updateHighlight({ node: nodeSelection, link: linkSelection, filteredEdges: [], highlightedNodeIds: new Set() })

      expect(nodeSelection.attr('opacity')).toBe('1')
      cleanup()
    })
  })

})
