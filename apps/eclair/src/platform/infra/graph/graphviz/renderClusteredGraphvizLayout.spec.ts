import {
  beforeEach, describe, expect, it, vi 
} from 'vitest'
import {
  LayoutError, RenderingError 
} from '@/platform/infra/errors/errors'
import { renderClusteredGraphvizLayout } from './renderClusteredGraphvizLayout'

const { renderString } = vi.hoisted(() => ({ renderString: vi.fn<(dot: string) => string>() }))

vi.mock('@viz-js/viz', () => ({ instance: async () => ({ renderString }) }))

describe('renderClusteredGraphvizLayout', () => {
  beforeEach(() => {
    renderString.mockReset()
    vi.stubGlobal('SVGPolygonElement', window.SVGElement)
  })

  function createSvgDocument(options: {
    includeGraphGroup?: boolean
    includeFirstNode?: boolean
    includeSecondNode?: boolean
  }): Document {
    const document = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" />',
      'image/svg+xml',
    )
    const svg = document.querySelector('svg')
    if (svg === null) {
      throw new RenderingError('Missing svg root')
    }

    if (options.includeGraphGroup !== false) {
      const graphGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      graphGroup.setAttribute('class', 'graph')
      graphGroup.setAttribute('transform', 'translate(10 20)')
      svg.append(graphGroup)

      const appendNode = (id: string, points: string): void => {
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        group.setAttribute('id', id)
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
        polygon.setAttribute('points', points)
        const parsedPoints = points.split(' ').map((pair) => {
          const [x, y] = pair.split(',').map(Number)
          return {
            x,
            y,
          }
        })
        Object.defineProperty(polygon, 'points', {
          value: {
            numberOfItems: parsedPoints.length,
            getItem: (index: number) => parsedPoints[index],
          },
        })
        group.append(polygon)
        graphGroup.append(group)
      }

      if (options.includeFirstNode !== false) {
        appendNode('clustered-layout-node-0', '0,0 100,0 100,50 0,50')
      }

      if (options.includeSecondNode !== false) {
        appendNode('clustered-layout-node-1', '120,10 220,10 220,60 120,60')
      }
    }

    return document
  }

  it('returns no positions when no nodes are provided', async () => {
    await expect(
      renderClusteredGraphvizLayout({
        nodes: [],
        edges: [],
      }),
    ).resolves.toStrictEqual({ positions: new Map() })
    expect(renderString).not.toHaveBeenCalled()
  })

  it('returns centered positions translated into canvas space', async () => {
    renderString.mockReturnValue(`
      <svg>
        <g class="graph" transform="translate(10 20)">
          <g id="clustered-layout-node-0"><polygon points="0,0 100,0 100,50 0,50" /></g>
          <g id="clustered-layout-node-1"><polygon points="120,10 220,10 220,60 120,60" /></g>
        </g>
      </svg>
    `)
    vi.spyOn(DOMParser.prototype, 'parseFromString').mockReturnValueOnce(createSvgDocument({}))

    const result = await renderClusteredGraphvizLayout({
      nodes: [
        {
          id: 'orders',
          label: 'Orders',
          widthPx: 100,
          heightPx: 50,
        },
        {
          id: 'shipping',
          label: 'Shipping',
          widthPx: 100,
          heightPx: 50,
        },
      ],
      edges: [
        {
          source: 'orders',
          target: 'shipping',
        },
      ],
    })

    expect(renderString.mock.calls[0]?.[0]).toContain('"orders" -> "shipping"')
    expect(result.positions.get('orders')).toStrictEqual({
      x: 122,
      y: 97,
    })
    expect(result.positions.get('shipping')).toStrictEqual({
      x: 242,
      y: 107,
    })
  })

  it('throws a rendering error when graphviz omits the graph group', async () => {
    renderString.mockReturnValue('<svg />')

    await expect(
      renderClusteredGraphvizLayout({
        nodes: [
          {
            id: 'orders',
            label: 'Orders',
            widthPx: 100,
            heightPx: 50,
          },
        ],
        edges: [],
      }),
    ).rejects.toBeInstanceOf(RenderingError)
  })

  it('throws a layout error when graphviz omits node bounds', async () => {
    renderString.mockReturnValue('<svg><g class="graph" transform="translate(0 0)"></g></svg>')
    vi.spyOn(DOMParser.prototype, 'parseFromString').mockReturnValueOnce(
      createSvgDocument({ includeFirstNode: false }),
    )

    const result = renderClusteredGraphvizLayout({
      nodes: [
        {
          id: 'orders',
          label: 'Orders',
          widthPx: 100,
          heightPx: 50,
        },
      ],
      edges: [],
    })

    await expect(result).rejects.toStrictEqual(
      expect.objectContaining({message: "Graphviz output did not contain bounds for node 'orders'",}),
    )
    await expect(result).rejects.toBeInstanceOf(LayoutError)
  })

  it('falls back to zero translation when graph transform is missing or invalid', async () => {
    renderString.mockReturnValue('<svg><g class="graph"></g></svg>')

    const documentWithoutTransform = createSvgDocument({ includeSecondNode: false })
    documentWithoutTransform.querySelector('g.graph')?.removeAttribute('transform')
    vi.spyOn(DOMParser.prototype, 'parseFromString').mockReturnValueOnce(documentWithoutTransform)

    await expect(
      renderClusteredGraphvizLayout({
        nodes: [
          {
            id: 'orders',
            label: 'Orders',
            widthPx: 100,
            heightPx: 50,
          },
        ],
        edges: [],
      }),
    ).resolves.toStrictEqual({
      positions: new Map([
        [
          'orders',
          {
            x: 122,
            y: 97,
          },
        ],
      ]),
    })

    const documentWithInvalidTransform = createSvgDocument({ includeSecondNode: false })
    documentWithInvalidTransform.querySelector('g.graph')?.setAttribute('transform', 'scale(2)')
    vi.spyOn(DOMParser.prototype, 'parseFromString').mockReturnValueOnce(
      documentWithInvalidTransform,
    )

    await expect(
      renderClusteredGraphvizLayout({
        nodes: [
          {
            id: 'orders',
            label: 'Orders',
            widthPx: 100,
            heightPx: 50,
          },
        ],
        edges: [],
      }),
    ).resolves.toStrictEqual({
      positions: new Map([
        [
          'orders',
          {
            x: 122,
            y: 97,
          },
        ],
      ]),
    })
  })

  it('throws a layout error when a node loses its generated DOM id', async () => {
    renderString.mockReturnValue('<svg><g class="graph" transform="translate(0 0)"></g></svg>')
    vi.spyOn(DOMParser.prototype, 'parseFromString').mockReturnValueOnce(
      createSvgDocument({ includeSecondNode: false }),
    )

    const originalGet = Map.prototype.get
    const mapGetSpy = vi.spyOn(Map.prototype, 'get').mockImplementation(function (
      this: Map<unknown, unknown>,
      key: unknown,
    ) {
      if (key === 'orders' && this.has('orders')) {
        return undefined
      }

      const value: unknown = originalGet.call(this, key)
      return value
    })

    await expect(
      renderClusteredGraphvizLayout({
        nodes: [
          {
            id: 'orders',
            label: 'Orders',
            widthPx: 100,
            heightPx: 50,
          },
        ],
        edges: [],
      }),
    ).rejects.toStrictEqual(
      expect.objectContaining({ message: "Missing DOM id for clustered node 'orders'" }),
    )

    mapGetSpy.mockRestore()
  })
})
