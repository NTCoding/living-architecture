import * as d3 from 'd3'
import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import {
  parseNode, parseEdge 
} from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import {
  createSimulationNodes,
  createSimulationLinks,
} from '../ForceGraph/VisualizationDataAdapters'
import type { DomainCircle } from './computeCircleEnclosures'
import { applyClusteredPresentation } from './applyClusteredPresentation'

const sourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

type BaseSelection = d3.Selection<d3.BaseType, unknown, null, undefined>

interface MockTransition {
  duration: (_duration: number) => MockTransition
  attr: (name: string, value: Parameters<BaseSelection['attr']>[1]) => MockTransition
  call: (
    fn: (selection: BaseSelection, ...args: unknown[]) => void,
    ...args: unknown[]
  ) => MockTransition
}

function createMockTransition(selection: BaseSelection): MockTransition {
  const transition: MockTransition = {
    duration: () => transition,
    attr: (name, value) => {
      selection.attr(name, value)
      return transition
    },
    call: (fn, ...args) => {
      fn(selection, ...args)
      return transition
    },
  }

  return transition
}

describe('applyClusteredPresentation', () => {
  beforeEach(() => {
    vi.spyOn(d3.selection.prototype, 'transition').mockImplementation(function transition(
      this: BaseSelection,
    ) {
      return createMockTransition(this)
    })
  })

  it('applies focused styling and zoom transform', () => {
    const fitViewport = vi.fn()
    const zoom = d3.zoom<SVGSVGElement, unknown>()
    const zoomTransformSpy = vi.spyOn(zoom, 'transform').mockImplementation(() => undefined)
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const svg = d3.select(svgElement)
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

    const node = svg
      .append('g')
      .selectAll<SVGGElement, (typeof nodes)[number]>('g')
      .data(nodes)
      .join('g')
    node.append('circle').attr('class', 'node-circle')
    node.append('text').attr('class', 'node-label')
    node.append('text').attr('class', 'node-domain-label')

    const link = svg
      .append('g')
      .selectAll<SVGPathElement, (typeof links)[number]>('path')
      .data(links)
      .join('path')
    const circles: DomainCircle[] = [
      {
        id: 'orders',
        domain: 'orders',
        label: 'Orders',
        x: 100,
        y: 120,
        r: 90,
        nodeIds: ['orders-api'],
      },
      {
        id: 'billing',
        domain: 'billing',
        label: 'Billing',
        x: 320,
        y: 120,
        r: 70,
        nodeIds: ['billing-worker'],
      },
    ]
    const domainGroup = svg
      .append('g')
      .selectAll<SVGGElement, (typeof circles)[number]>('g')
      .data(circles)
      .join('g')
    domainGroup.append('circle')
    domainGroup.append('text')

    applyClusteredPresentation({
      svg,
      zoom,
      node,
      link,
      domainGroup,
      nodes,
      circles,
      focusedDomain: 'orders',
      width: 800,
      height: 600,
      shouldFitViewport: true,
      fitViewport,
    })

    const circleAttrs = svgElement.querySelectorAll('.node-circle')
    expect([
      circleAttrs[0]?.getAttribute('opacity'),
      circleAttrs[1]?.getAttribute('opacity'),
      svgElement.querySelector('path')?.getAttribute('opacity'),
      svgElement.querySelectorAll('g circle')[2]?.getAttribute('opacity'),
      svgElement.querySelectorAll('g circle')[3]?.getAttribute('opacity'),
    ]).toStrictEqual(['1', '0.18', '0.82', '1', '0.28'])
    expect(zoomTransformSpy).toHaveBeenCalledOnce()
    expect(fitViewport).not.toHaveBeenCalled()
  })

  it('resets styling and fits viewport when no domain is focused', () => {
    const fitViewport = vi.fn()
    const zoom = d3.zoom<SVGSVGElement, unknown>()
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const svg = d3.select(svgElement)
    const nodes = createSimulationNodes([
      parseNode({
        sourceLocation,
        id: 'orders-api',
        type: 'API',
        name: 'Orders API',
        domain: 'orders',
        module: 'api',
      }),
    ])
    const node = svg
      .append('g')
      .selectAll<SVGGElement, (typeof nodes)[number]>('g')
      .data(nodes)
      .join('g')
    node.append('circle').attr('class', 'node-circle')
    node.append('text').attr('class', 'node-label')
    node.append('text').attr('class', 'node-domain-label')
    const links = createSimulationLinks([])
    const link = svg
      .append('g')
      .selectAll<SVGPathElement, (typeof links)[number]>('path')
      .data(links)
      .join('path')
    const circles: DomainCircle[] = [
      {
        id: 'orders',
        domain: 'orders',
        label: 'Orders',
        x: 100,
        y: 120,
        r: 90,
        nodeIds: ['orders-api'],
      },
    ]
    const domainGroup = svg
      .append('g')
      .selectAll<SVGGElement, (typeof circles)[number]>('g')
      .data(circles)
      .join('g')
    domainGroup.append('circle')
    domainGroup.append('text')

    applyClusteredPresentation({
      svg,
      zoom,
      node,
      link,
      domainGroup,
      nodes,
      circles,
      focusedDomain: null,
      width: 800,
      height: 600,
      shouldFitViewport: true,
      fitViewport,
    })

    expect(svgElement.querySelector('.node-circle')?.getAttribute('stroke')).toBe(
      'rgba(255, 255, 255, 0.3)',
    )
    expect(svgElement.querySelector('.node-label')?.getAttribute('opacity')).toBe('1')
    expect(svgElement.querySelector('g circle')?.getAttribute('stroke-width')).toBe('2')
    expect(fitViewport).toHaveBeenCalledOnce()
  })

  it('skips zooming when the focused domain circle is missing', () => {
    const fitViewport = vi.fn()
    const zoom = d3.zoom<SVGSVGElement, unknown>()
    const zoomTransformSpy = vi.spyOn(zoom, 'transform').mockImplementation(() => undefined)
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const svg = d3.select(svgElement)
    const nodes = createSimulationNodes([
      parseNode({
        sourceLocation,
        id: 'orders-api',
        type: 'API',
        name: 'Orders API',
        domain: 'orders',
        module: 'api',
      }),
    ])
    const node = svg
      .append('g')
      .selectAll<SVGGElement, (typeof nodes)[number]>('g')
      .data(nodes)
      .join('g')
    node.append('circle').attr('class', 'node-circle')
    node.append('text').attr('class', 'node-label')
    node.append('text').attr('class', 'node-domain-label')
    const links = createSimulationLinks([])
    const link = svg
      .append('g')
      .selectAll<SVGPathElement, (typeof links)[number]>('path')
      .data(links)
      .join('path')
    const circles: DomainCircle[] = []
    const domainGroup = svg
      .append('g')
      .selectAll<SVGGElement, DomainCircle>('g')
      .data(circles)
      .join('g')

    applyClusteredPresentation({
      svg,
      zoom,
      node,
      link,
      domainGroup,
      nodes,
      circles,
      focusedDomain: 'orders',
      width: 800,
      height: 600,
      shouldFitViewport: true,
      fitViewport,
    })

    expect(zoomTransformSpy).not.toHaveBeenCalled()
    expect(fitViewport).not.toHaveBeenCalled()
    expect(svgElement.querySelector('.node-circle')?.getAttribute('opacity')).toBe('1')
    expect(svgElement.querySelector('.node-label')?.getAttribute('opacity')).toBe('1')
  })

  it('does not fit the viewport when fitting is disabled', () => {
    const fitViewport = vi.fn()
    const zoom = d3.zoom<SVGSVGElement, unknown>()
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const svg = d3.select(svgElement)
    const nodes = createSimulationNodes([
      parseNode({
        sourceLocation,
        id: 'orders-api',
        type: 'API',
        name: 'Orders API',
        domain: 'orders',
        module: 'api',
      }),
    ])
    const node = svg
      .append('g')
      .selectAll<SVGGElement, (typeof nodes)[number]>('g')
      .data(nodes)
      .join('g')
    node.append('circle').attr('class', 'node-circle')
    node.append('text').attr('class', 'node-label')
    node.append('text').attr('class', 'node-domain-label')
    const links = createSimulationLinks([])
    const link = svg
      .append('g')
      .selectAll<SVGPathElement, (typeof links)[number]>('path')
      .data(links)
      .join('path')
    const circles: DomainCircle[] = [
      {
        id: 'orders',
        domain: 'orders',
        label: 'Orders',
        x: 100,
        y: 120,
        r: 90,
        nodeIds: ['orders-api'],
      },
    ]
    const domainGroup = svg
      .append('g')
      .selectAll<SVGGElement, (typeof circles)[number]>('g')
      .data(circles)
      .join('g')
    domainGroup.append('circle')
    domainGroup.append('text')

    applyClusteredPresentation({
      svg,
      zoom,
      node,
      link,
      domainGroup,
      nodes,
      circles,
      focusedDomain: null,
      width: 800,
      height: 600,
      shouldFitViewport: false,
      fitViewport,
    })

    expect(fitViewport).not.toHaveBeenCalled()
  })

  it('emphasizes links fully inside the focused domain', () => {
    const fitViewport = vi.fn()
    const zoom = d3.zoom<SVGSVGElement, unknown>()
    vi.spyOn(zoom, 'transform').mockImplementation(() => undefined)
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const svg = d3.select(svgElement)
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
        id: 'orders-worker',
        type: 'UseCase',
        name: 'Orders Worker',
        domain: 'orders',
        module: 'core',
      }),
    ])
    const links = createSimulationLinks([
      parseEdge({
        source: 'orders-api',
        target: 'orders-worker',
        type: 'sync',
      }),
    ])
    const node = svg
      .append('g')
      .selectAll<SVGGElement, (typeof nodes)[number]>('g')
      .data(nodes)
      .join('g')
    node.append('circle').attr('class', 'node-circle')
    node.append('text').attr('class', 'node-label')
    node.append('text').attr('class', 'node-domain-label')
    const link = svg
      .append('g')
      .selectAll<SVGPathElement, (typeof links)[number]>('path')
      .data(links)
      .join('path')
    const circles: DomainCircle[] = [
      {
        id: 'orders',
        domain: 'orders',
        label: 'Orders',
        x: 100,
        y: 120,
        r: 90,
        nodeIds: ['orders-api', 'orders-worker'],
      },
    ]
    const domainGroup = svg
      .append('g')
      .selectAll<SVGGElement, (typeof circles)[number]>('g')
      .data(circles)
      .join('g')
    domainGroup.append('circle')
    domainGroup.append('text')

    applyClusteredPresentation({
      svg,
      zoom,
      node,
      link,
      domainGroup,
      nodes,
      circles,
      focusedDomain: 'orders',
      width: 800,
      height: 600,
      shouldFitViewport: true,
      fitViewport,
    })

    expect(svgElement.querySelector('path')?.getAttribute('stroke-width')).toBe('2.8')
    expect(svgElement.querySelector('path')?.getAttribute('opacity')).toBe('0.82')
  })
})
