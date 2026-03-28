import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import { applyGraphvizLayout } from './architecture-evolution-layout'

const { renderString } = vi.hoisted(() => ({ renderString: vi.fn() }))

vi.mock('@viz-js/viz', () => ({ instance: async () => ({ renderString }) }))

describe('architecture-evolution-layout', () => {
  function requireElement<T extends Element>(element: T | null, message: string): T {
    if (element === null) {
      throw new TypeError(message)
    }

    return element
  }

  function requireMockDot(): string {
    const dot = renderString.mock.calls[0]?.[0]

    if (typeof dot !== 'string') {
      throw new TypeError('Expected renderString to receive dot markup')
    }

    return dot
  }

  beforeEach(() => {
    renderString.mockReset()
    vi.stubGlobal('SVGPolygonElement', window.SVGElement)
    vi.stubGlobal('SVGPathElement', window.SVGElement)
    vi.stubGlobal('SVGGElement', window.SVGElement)
  })

  it('applies graphviz layout to nodes, boundaries, and edge paths', async () => {
    renderString.mockReturnValue('<svg />')
    const document = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" />',
      'image/svg+xml',
    )
    const root = requireElement(document.querySelector('svg'), 'Missing svg root')
    const graphGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    graphGroup.setAttribute('class', 'graph')
    graphGroup.setAttribute('transform', 'translate(10 20)')
    root.append(graphGroup)

    const appendPolygonGroup = (
      id: string,
      points: Array<{
        x: number
        y: number
      }>,
    ): void => {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      group.setAttribute('id', id)
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
      Object.defineProperty(polygon, 'points', {
        value: {
          numberOfItems: points.length,
          getItem: (index: number) => points[index],
        },
      })
      group.append(polygon)
      graphGroup.append(group)
    }

    const clusterGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    clusterGroup.setAttribute('class', 'cluster')
    const clusterTitle = document.createElementNS('http://www.w3.org/2000/svg', 'title')
    clusterTitle.textContent = 'cluster_slice_a'
    const clusterPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    Object.defineProperty(clusterPolygon, 'points', {
      value: {
        numberOfItems: 4,
        getItem: (index: number) =>
          [
            {
              x: 0,
              y: 0,
            },
            {
              x: 250,
              y: 0,
            },
            {
              x: 250,
              y: 160,
            },
            {
              x: 0,
              y: 160,
            },
          ][index],
      },
    })
    clusterGroup.append(clusterTitle)
    clusterGroup.append(clusterPolygon)
    graphGroup.append(clusterGroup)

    appendPolygonGroup('orders-service-a', [
      {
        x: 40,
        y: 40,
      },
      {
        x: 140,
        y: 40,
      },
      {
        x: 140,
        y: 90,
      },
      {
        x: 40,
        y: 90,
      },
    ])
    appendPolygonGroup('orders-db-a', [
      {
        x: 40,
        y: 110,
      },
      {
        x: 140,
        y: 110,
      },
      {
        x: 140,
        y: 160,
      },
      {
        x: 40,
        y: 160,
      },
    ])
    appendPolygonGroup('external-gateway', [
      {
        x: 280,
        y: 70,
      },
      {
        x: 380,
        y: 70,
      },
      {
        x: 380,
        y: 120,
      },
      {
        x: 280,
        y: 120,
      },
    ])

    const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    edgeGroup.setAttribute('id', 'edge-1')
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M140,65 L280,95')
    edgeGroup.append(path)
    graphGroup.append(edgeGroup)

    vi.spyOn(DOMParser.prototype, 'parseFromString').mockReturnValueOnce(document)

    const result = await applyGraphvizLayout(
      [
        {
          id: 'orders-service-a',
          position: {
            x: 0,
            y: 0,
          },
          data: {
            kind: 'service',
            label: 'Orders Service A',
          },
        },
        {
          id: 'orders-db-a',
          position: {
            x: 0,
            y: 0,
          },
          data: {
            kind: 'database',
            label: 'Orders DB A',
          },
        },
        {
          id: 'external-gateway',
          position: {
            x: 0,
            y: 0,
          },
          data: {
            kind: 'external',
            label: 'Gateway',
          },
        },
      ],
      [
        {
          id: 'edge-1',
          source: 'orders-service-a',
          target: 'external-gateway',
        },
      ],
    )

    expect(result.boundaries).toHaveLength(1)
    expect(result.nodes.find((node) => node.id === 'orders-service-a')?.position).toStrictEqual({
      x: 80,
      y: 80,
    })
    expect(result.edgePathsById.get('edge-1')).toBe('M180,105 L320,135')
    expect(requireMockDot()).toMatch(/label="Orders Domain A"[\s\S]*"external-gateway" \[/)
  })

  it('adds same-rank externals and falls back to node ids for labels', async () => {
    renderString.mockReturnValue('<svg />')

    await expect(
      applyGraphvizLayout(
        [
          {
            id: 'orders-service-a',
            position: {
              x: 0,
              y: 0,
            },
            data: { kind: 'service' },
          },
          {
            id: 'orders-db-a',
            position: {
              x: 0,
              y: 0,
            },
            data: { kind: 'database' },
          },
          {
            id: 'orders-service-b',
            position: {
              x: 0,
              y: 0,
            },
            data: { kind: 'service' },
          },
          {
            id: 'external-a',
            position: {
              x: 0,
              y: 0,
            },
            data: { kind: 'external' },
          },
          {
            id: 'external-b',
            position: {
              x: 0,
              y: 0,
            },
            data: { kind: 'external' },
          },
          {
            id: 'standalone',
            position: {
              x: 0,
              y: 0,
            },
            data: {},
          },
        ],
        [],
      ),
    ).rejects.toThrow('Graphviz output did not contain a graph group')

    const dot = requireMockDot()
    expect(dot).toContain('{ rank=same; "external-a"; "external-b"; "standalone" }')
    expect(dot).toMatch(/"external-a" \[width=.*label="external-a"/)
    expect(dot).toContain('label="standalone"')
  })

  it('leaves unmatched slices unclustered', async () => {
    renderString.mockReturnValue('<svg />')

    await expect(
      applyGraphvizLayout(
        [
          {
            id: 'orders-service-a',
            position: {
              x: 0,
              y: 0,
            },
            data: { kind: 'service' },
          },
          {
            id: 'orders-db-a',
            position: {
              x: 0,
              y: 0,
            },
            data: { kind: 'database' },
          },
          {
            id: 'orders-service-b',
            position: {
              x: 0,
              y: 0,
            },
            data: { kind: 'service' },
          },
          {
            id: 'standalone',
            position: {
              x: 0,
              y: 0,
            },
            data: {},
          },
        ],
        [],
      ),
    ).rejects.toThrow('Graphviz output did not contain a graph group')

    const dot = requireMockDot()
    expect(dot).toContain('"standalone" [width=')
    expect(dot).not.toContain('cluster_slice_b')
    expect(dot).not.toContain('cluster_slice_standalone')
  })

  it('throws when graphviz output has no graph group', async () => {
    renderString.mockReturnValue('<svg />')

    await expect(applyGraphvizLayout([], [])).rejects.toThrow(
      'Graphviz output did not contain a graph group',
    )
  })

  it('leaves nodes unchanged when graphviz omits their bounds', async () => {
    renderString.mockReturnValue('<svg />')
    const document = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" />',
      'image/svg+xml',
    )
    const root = requireElement(document.querySelector('svg'), 'Missing svg root')
    const graphGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    graphGroup.setAttribute('class', 'graph')
    graphGroup.setAttribute('transform', 'translate(0 0)')
    root.append(graphGroup)

    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    nodeGroup.setAttribute('id', 'present-node')
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    Object.defineProperty(polygon, 'points', {
      value: {
        numberOfItems: 4,
        getItem: (index: number) =>
          [
            {
              x: 0,
              y: 0,
            },
            {
              x: 100,
              y: 0,
            },
            {
              x: 100,
              y: 50,
            },
            {
              x: 0,
              y: 50,
            },
          ][index],
      },
    })
    nodeGroup.append(polygon)
    graphGroup.append(nodeGroup)

    vi.spyOn(DOMParser.prototype, 'parseFromString').mockReturnValueOnce(document)

    const missingNode = {
      id: 'missing-node',
      position: {
        x: 5,
        y: 7,
      },
      data: { kind: 'external' },
    }
    const result = await applyGraphvizLayout(
      [
        {
          id: 'present-node',
          position: {
            x: 0,
            y: 0,
          },
          data: { kind: 'external' },
        },
        missingNode,
      ],
      [],
    )

    expect(result.nodes.find((node) => node.id === 'missing-node')).toStrictEqual(missingNode)
  })
})
