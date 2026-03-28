import {
  describe, expect, it, vi, beforeEach 
} from 'vitest'
import {
  collectClusterBoundaries,
  collectEdgePaths,
  collectNodeBounds,
  parseTranslate,
  translatePathData,
} from './architecture-evolution-layout-support'

describe('architecture-evolution-layout-support', () => {
  function requireElement<T extends Element>(element: T | null, message: string): T {
    if (element === null) {
      throw new TypeError(message)
    }

    return element
  }

  beforeEach(() => {
    vi.stubGlobal('SVGPolygonElement', window.SVGElement)
    vi.stubGlobal('SVGPathElement', window.SVGElement)
  })

  it('parses translate strings and falls back to origin', () => {
    expect(parseTranslate('translate(12 34)')).toStrictEqual({
      x: 12,
      y: 34,
    })
    expect(parseTranslate('scale(2)')).toStrictEqual({
      x: 0,
      y: 0,
    })
    expect(parseTranslate(null)).toStrictEqual({
      x: 0,
      y: 0,
    })
  })

  it('translates path data coordinates while preserving commands', () => {
    expect(translatePathData('M0,0 L10,10 C20,20 30,30 40,40', 5, -3)).toBe(
      'M5,-3 L15,7 C25,17 35,27 45,37',
    )
  })

  it('collects cluster, node, and edge geometry from svg markup', () => {
    const svg = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" />',
      'image/svg+xml',
    )
    const root = requireElement(svg.querySelector('svg'), 'Missing svg root')

    const clusterGroup = svg.createElementNS('http://www.w3.org/2000/svg', 'g')
    clusterGroup.setAttribute('class', 'cluster')
    const title = svg.createElementNS('http://www.w3.org/2000/svg', 'title')
    title.textContent = 'cluster_slice_a'
    const clusterPolygon = svg.createElementNS('http://www.w3.org/2000/svg', 'polygon')
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
    clusterGroup.append(title)
    clusterGroup.append(clusterPolygon)
    root.append(clusterGroup)

    const nodeGroup = svg.createElementNS('http://www.w3.org/2000/svg', 'g')
    nodeGroup.setAttribute('id', 'service-a')
    const nodePolygon = svg.createElementNS('http://www.w3.org/2000/svg', 'polygon')
    Object.defineProperty(nodePolygon, 'points', {
      value: {
        numberOfItems: 4,
        getItem: (index: number) =>
          [
            {
              x: 120,
              y: 40,
            },
            {
              x: 220,
              y: 40,
            },
            {
              x: 220,
              y: 90,
            },
            {
              x: 120,
              y: 90,
            },
          ][index],
      },
    })
    nodeGroup.append(nodePolygon)
    root.append(nodeGroup)

    const edgeGroup = svg.createElementNS('http://www.w3.org/2000/svg', 'g')
    edgeGroup.setAttribute('id', 'service-a->db-a')
    const path = svg.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M120,65 L220,65')
    edgeGroup.append(path)
    root.append(edgeGroup)

    const clusterState = collectClusterBoundaries(
      svg,
      new Map([
        [
          'cluster_slice_a',
          {
            id: 'slice-a',
            label: 'Slice A',
            kind: 'slice',
            nodeIds: ['service-a'],
          },
        ],
      ]),
      {
        x: 10,
        y: 20,
      },
    )
    const nodeState = collectNodeBounds(
      svg,
      [
        {
          id: 'service-a',
          position: {
            x: 0,
            y: 0,
          },
          data: {},
        },
      ],
      {
        x: 10,
        y: 20,
      },
    )
    const edgeState = collectEdgePaths(
      svg,
      [
        {
          id: 'service-a->db-a',
          source: 'service-a',
          target: 'db-a',
        },
      ],
      {
        x: 10,
        y: 20,
      },
    )

    expect(clusterState.boundaries).toStrictEqual([
      {
        id: 'slice-a',
        label: 'Slice A',
        kind: 'slice',
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      },
    ])
    expect(nodeState.nodeBoundsById.get('service-a')).toStrictEqual({
      x: 130,
      y: 60,
      width: 100,
      height: 50,
    })
    expect(edgeState.edgePathsById.get('service-a->db-a')).toBe('M130,85 L230,85')
  })

  it('throws when an edge path is missing data', () => {
    const svg = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg"><g id="edge-1"><path /></g></svg>',
      'image/svg+xml',
    )

    expect(() =>
      collectEdgePaths(
        svg,
        [
          {
            id: 'edge-1',
            source: 'a',
            target: 'b',
          },
        ],
        {
          x: 0,
          y: 0,
        },
      ),
    ).toThrow('Expected path data for edge edge-1')
  })

  it('leaves invalid path tokens unchanged', () => {
    expect(translatePathData('', 5, 5)).toBe('')
    expect(translatePathData('M0,0 Lbad,10 20 30,40,50', 5, 5)).toBe('M5,5 Lbad,10 20 30,40,50')
  })

  it('skips incomplete svg geometry', () => {
    const svg = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg" />',
      'image/svg+xml',
    )
    const root = requireElement(svg.querySelector('svg'), 'Missing svg root')

    const untitledCluster = svg.createElementNS('http://www.w3.org/2000/svg', 'g')
    untitledCluster.setAttribute('class', 'cluster')
    untitledCluster.append(svg.createElementNS('http://www.w3.org/2000/svg', 'polygon'))
    root.append(untitledCluster)

    const invalidCluster = svg.createElementNS('http://www.w3.org/2000/svg', 'g')
    invalidCluster.setAttribute('class', 'cluster')
    const clusterTitle = svg.createElementNS('http://www.w3.org/2000/svg', 'title')
    clusterTitle.textContent = 'cluster_slice_a'
    invalidCluster.append(clusterTitle)
    root.append(invalidCluster)

    const nodeGroup = svg.createElementNS('http://www.w3.org/2000/svg', 'g')
    nodeGroup.setAttribute('id', 'service-a')
    root.append(nodeGroup)

    const edgeGroup = svg.createElementNS('http://www.w3.org/2000/svg', 'g')
    edgeGroup.setAttribute('id', 'edge-1')
    root.append(edgeGroup)

    expect(
      collectClusterBoundaries(
        svg,
        new Map([
          [
            'cluster_slice_a',
            {
              id: 'slice-a',
              label: 'Slice A',
              kind: 'slice',
              nodeIds: ['service-a'],
            },
          ],
        ]),
        {
          x: 0,
          y: 0,
        },
      ),
    ).toStrictEqual({
      boundaries: [],
      bounds: {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    })

    expect(
      collectNodeBounds(
        svg,
        [
          {
            id: 'service-a',
            position: {
              x: 0,
              y: 0,
            },
            data: {},
          },
        ],
        {
          x: 0,
          y: 0,
        },
      ),
    ).toStrictEqual({
      nodeBoundsById: new Map(),
      bounds: {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    })

    expect(
      collectEdgePaths(
        svg,
        [
          {
            id: 'edge-1',
            source: 'service-a',
            target: 'db-a',
          },
        ],
        {
          x: 0,
          y: 0,
        },
      ),
    ).toStrictEqual({
      edgePathsById: new Map(),
      bounds: {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    })
  })

  it('normalizes edge coordinate tokens when computing bounds', () => {
    const svg = new DOMParser().parseFromString(
      '<svg xmlns="http://www.w3.org/2000/svg"><g id="edge-1"><path d="M01,02 L003,004" /></g></svg>',
      'image/svg+xml',
    )

    expect(
      collectEdgePaths(
        svg,
        [
          {
            id: 'edge-1',
            source: 'a',
            target: 'b',
          },
        ],
        {
          x: 0,
          y: 0,
        },
      ),
    ).toStrictEqual({
      edgePathsById: new Map([['edge-1', 'M1,2 L3,4']]),
      bounds: {
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    })
  })
})
