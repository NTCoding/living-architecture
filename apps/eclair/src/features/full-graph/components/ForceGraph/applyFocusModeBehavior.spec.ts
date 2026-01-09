import {
  describe, it, expect, vi 
} from 'vitest'
import * as d3 from 'd3'
import {
  applyFocusMode, applyResetMode 
} from './applyFocusModeBehavior'
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

function createTestNode(id: string, type: SimulationNode['type'], domain: string): SimulationNode {
  return {
    id,
    type,
    name: `node-${id}`,
    domain,
    x: 100,
    y: 100,
    originalNode: parseNode({
      id,
      type,
      name: `node-${id}`,
      domain,
      module: 'test-module',
      sourceLocation: testSourceLocation,
      ...(type === 'Event' ? { eventName: 'TestEvent' } : {}),
      ...(type === 'UI' ? { route: '/test' } : {}),
    }),
  }
}

function createTestLink(sourceId: string, targetId: string): SimulationLink {
  return {
    source: sourceId,
    target: targetId,
    type: 'sync',
    originalEdge: parseEdge({
      source: sourceId,
      target: targetId,
      type: 'sync',
    }),
  }
}

interface TestContext {
  svgElement: SVGSVGElement
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
  nodeGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  linkGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  zoom: d3.ZoomBehavior<SVGSVGElement, unknown>
}

function createTestContext(): TestContext {
  const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svgElement.setAttribute('width', '800')
  svgElement.setAttribute('height', '600')
  document.body.appendChild(svgElement)

  const svg = d3.select(svgElement)
  const nodeGroup = svg.append('g').attr('class', 'nodes')
  const linkGroup = svg.append('g').attr('class', 'links')

  const zoom = d3.zoom<SVGSVGElement, unknown>()

  const originalTransition = svg.transition.bind(svg)
  vi.spyOn(svg, 'transition').mockImplementation(() => {
    const t = originalTransition()
    vi.spyOn(t, 'call').mockReturnValue(t)
    return t
  })

  return {
    svgElement,
    svg,
    nodeGroup,
    linkGroup,
    zoom,
  }
}

function cleanupContext(ctx: TestContext): void {
  ctx.svgElement.remove()
}

describe('applyFocusModeBehavior', () => {
  describe('applyFocusMode', () => {
    it('applies focus mode without throwing when domain matches nodes', () => {
      const ctx = createTestContext()
      const nodes: SimulationNode[] = [
        createTestNode('api-1', 'API', 'orders'),
        createTestNode('usecase-1', 'UseCase', 'orders'),
        createTestNode('api-2', 'API', 'payments'),
      ]

      const nodeSelection = ctx.nodeGroup
        .selectAll<SVGGElement, SimulationNode>('g')
        .data(nodes)
        .join('g')

      nodeSelection.append('circle').attr('class', 'node-circle')
      nodeSelection.append('text').attr('class', 'node-label')
      nodeSelection.append('text').attr('class', 'node-domain-label')

      const links: SimulationLink[] = [createTestLink('api-1', 'usecase-1')]
      const linkSelection = ctx.linkGroup
        .selectAll<SVGPathElement, SimulationLink>('path')
        .data(links)
        .join('path')

      expect(() =>
        applyFocusMode({
          svg: ctx.svg,
          node: nodeSelection,
          link: linkSelection,
          zoom: ctx.zoom,
          nodes,
          domain: 'orders',
          theme: 'stream',
          dimensions: {
            width: 800,
            height: 600,
          },
        }),
      ).not.toThrow()

      cleanupContext(ctx)
    })

    it('handles empty nodes array', () => {
      const ctx = createTestContext()
      const nodes: SimulationNode[] = []
      const nodeSelection = ctx.nodeGroup
        .selectAll<SVGGElement, SimulationNode>('g')
        .data(nodes)
        .join('g')
      const linkSelection = ctx.linkGroup
        .selectAll<SVGPathElement, SimulationLink>('path')
        .data([])
        .join('path')

      expect(() =>
        applyFocusMode({
          svg: ctx.svg,
          node: nodeSelection,
          link: linkSelection,
          zoom: ctx.zoom,
          nodes,
          domain: 'nonexistent',
          theme: 'stream',
          dimensions: {
            width: 800,
            height: 600,
          },
        }),
      ).not.toThrow()

      cleanupContext(ctx)
    })

    it('applies focus mode with voltage theme', () => {
      const ctx = createTestContext()
      const nodes: SimulationNode[] = [createTestNode('api-1', 'API', 'orders')]
      const nodeSelection = ctx.nodeGroup
        .selectAll<SVGGElement, SimulationNode>('g')
        .data(nodes)
        .join('g')
      nodeSelection.append('circle').attr('class', 'node-circle')
      nodeSelection.append('text').attr('class', 'node-label')
      nodeSelection.append('text').attr('class', 'node-domain-label')
      const linkSelection = ctx.linkGroup
        .selectAll<SVGPathElement, SimulationLink>('path')
        .data([])
        .join('path')

      expect(() =>
        applyFocusMode({
          svg: ctx.svg,
          node: nodeSelection,
          link: linkSelection,
          zoom: ctx.zoom,
          nodes,
          domain: 'orders',
          theme: 'voltage',
          dimensions: {
            width: 800,
            height: 600,
          },
        }),
      ).not.toThrow()

      cleanupContext(ctx)
    })

    it('applies focus mode with circuit theme', () => {
      const ctx = createTestContext()
      const nodes: SimulationNode[] = [createTestNode('api-1', 'API', 'orders')]
      const nodeSelection = ctx.nodeGroup
        .selectAll<SVGGElement, SimulationNode>('g')
        .data(nodes)
        .join('g')
      nodeSelection.append('circle').attr('class', 'node-circle')
      nodeSelection.append('text').attr('class', 'node-label')
      nodeSelection.append('text').attr('class', 'node-domain-label')
      const linkSelection = ctx.linkGroup
        .selectAll<SVGPathElement, SimulationLink>('path')
        .data([])
        .join('path')

      expect(() =>
        applyFocusMode({
          svg: ctx.svg,
          node: nodeSelection,
          link: linkSelection,
          zoom: ctx.zoom,
          nodes,
          domain: 'orders',
          theme: 'circuit',
          dimensions: {
            width: 800,
            height: 600,
          },
        }),
      ).not.toThrow()

      cleanupContext(ctx)
    })

    it('handles domain with no matching nodes', () => {
      const ctx = createTestContext()
      const nodes: SimulationNode[] = [
        createTestNode('api-1', 'API', 'orders'),
        createTestNode('usecase-1', 'UseCase', 'payments'),
      ]
      const nodeSelection = ctx.nodeGroup
        .selectAll<SVGGElement, SimulationNode>('g')
        .data(nodes)
        .join('g')
      nodeSelection.append('circle').attr('class', 'node-circle')
      nodeSelection.append('text').attr('class', 'node-label')
      nodeSelection.append('text').attr('class', 'node-domain-label')
      const linkSelection = ctx.linkGroup
        .selectAll<SVGPathElement, SimulationLink>('path')
        .data([])
        .join('path')

      expect(() =>
        applyFocusMode({
          svg: ctx.svg,
          node: nodeSelection,
          link: linkSelection,
          zoom: ctx.zoom,
          nodes,
          domain: 'nonexistent',
          theme: 'stream',
          dimensions: {
            width: 800,
            height: 600,
          },
        }),
      ).not.toThrow()

      cleanupContext(ctx)
    })
  })

  describe('applyResetMode', () => {
    it('resets focus mode without throwing', () => {
      const ctx = createTestContext()
      const nodes: SimulationNode[] = [
        createTestNode('api-1', 'API', 'orders'),
        createTestNode('usecase-1', 'UseCase', 'orders'),
      ]

      const nodeSelection = ctx.nodeGroup
        .selectAll<SVGGElement, SimulationNode>('g')
        .data(nodes)
        .join('g')

      nodeSelection.append('circle').attr('class', 'node-circle')
      nodeSelection.append('text').attr('class', 'node-label')
      nodeSelection.append('text').attr('class', 'node-domain-label')

      const links: SimulationLink[] = [createTestLink('api-1', 'usecase-1')]
      const linkSelection = ctx.linkGroup
        .selectAll<SVGPathElement, SimulationLink>('path')
        .data(links)
        .join('path')

      expect(() =>
        applyResetMode({
          node: nodeSelection,
          link: linkSelection,
        }),
      ).not.toThrow()

      cleanupContext(ctx)
    })

    it('handles empty selections', () => {
      const ctx = createTestContext()
      const nodeSelection = ctx.nodeGroup
        .selectAll<SVGGElement, SimulationNode>('g')
        .data([])
        .join('g')
      const linkSelection = ctx.linkGroup
        .selectAll<SVGPathElement, SimulationLink>('path')
        .data([])
        .join('path')

      expect(() =>
        applyResetMode({
          node: nodeSelection,
          link: linkSelection,
        }),
      ).not.toThrow()

      cleanupContext(ctx)
    })

    it('resets after focus mode was applied', () => {
      const ctx = createTestContext()
      const nodes: SimulationNode[] = [
        createTestNode('api-1', 'API', 'orders'),
        createTestNode('api-2', 'API', 'payments'),
      ]

      const nodeSelection = ctx.nodeGroup
        .selectAll<SVGGElement, SimulationNode>('g')
        .data(nodes)
        .join('g')

      nodeSelection.append('circle').attr('class', 'node-circle')
      nodeSelection.append('text').attr('class', 'node-label')
      nodeSelection.append('text').attr('class', 'node-domain-label')

      const linkSelection = ctx.linkGroup
        .selectAll<SVGPathElement, SimulationLink>('path')
        .data([])
        .join('path')

      applyFocusMode({
        svg: ctx.svg,
        node: nodeSelection,
        link: linkSelection,
        zoom: ctx.zoom,
        nodes,
        domain: 'orders',
        theme: 'stream',
        dimensions: {
          width: 800,
          height: 600,
        },
      })

      expect(() =>
        applyResetMode({
          node: nodeSelection,
          link: linkSelection,
        }),
      ).not.toThrow()

      cleanupContext(ctx)
    })
  })
})
