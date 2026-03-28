import {
  describe, expect, it 
} from 'vitest'
import { parseNode } from '@/platform/infra/__fixtures__/riviere-test-fixtures'
import { createSimulationNodes } from '../ForceGraph/VisualizationDataAdapters'
import {
  CLUSTER_LABEL_STROKE_WIDTH,
  calculateCircleFocusTransform,
  calculateViewportTransform,
  getClusterLabelFontSize,
  getClusterLabelY,
} from './clusteredGraphGeometry'

const sourceLocation = {
  repository: 'test-repo',
  filePath: 'src/test.ts',
}

describe('clusteredGraphGeometry', () => {
  function requireValue<T>(value: T | undefined, message: string): T {
    if (value === undefined) {
      throw new TypeError(message)
    }

    return value
  }

  it('computes label placement and font size bounds', () => {
    const circle = {
      id: 'orders',
      domain: 'orders',
      label: 'Orders',
      x: 100,
      y: 200,
      r: 150,
      nodeIds: [],
    }

    expect(CLUSTER_LABEL_STROKE_WIDTH).toBe(14)
    expect(getClusterLabelFontSize(circle)).toBe(63)
    expect(getClusterLabelY(circle)).toBe(30)
  })

  it('calculates a bounded viewport transform from nodes and circles', () => {
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
    const node = requireValue(nodes[0], 'Missing simulation node')
    node.x = 100
    node.y = 200

    const transform = calculateViewportTransform({
      nodes: [node],
      circles: [
        {
          id: 'orders',
          domain: 'orders',
          label: 'Orders',
          x: 120,
          y: 220,
          r: 100,
          nodeIds: ['orders-api'],
        },
      ],
      width: 800,
      height: 600,
      padding: 40,
    })

    expect(transform.scale).toBeLessThanOrEqual(1)
    expect(transform.translateX).toBeTypeOf('number')
    expect(transform.translateY).toBeTypeOf('number')
  })

  it('handles empty graph bounds and nodes without coordinates', () => {
    const nodes = createSimulationNodes([
      parseNode({
        sourceLocation,
        id: 'orphan',
        type: 'API',
        name: 'Orphan',
        domain: 'orders',
        module: 'api',
      }),
    ])
    const orphanNode = requireValue(nodes[0], 'Missing orphan node')

    expect(
      calculateViewportTransform({
        nodes: [orphanNode],
        circles: [],
        width: 500,
        height: 300,
        padding: 20,
      }),
    ).toStrictEqual({
      scale: 1,
      translateX: 250,
      translateY: 150,
    })
  })

  it('respects the minimum cluster label font size', () => {
    expect(
      getClusterLabelFontSize({
        id: 'tiny',
        domain: 'tiny',
        label: 'Tiny',
        x: 0,
        y: 0,
        r: 20,
        nodeIds: [],
      }),
    ).toBe(60)
  })

  it('calculates a focus transform centered on a domain circle', () => {
    expect(
      calculateCircleFocusTransform({
        circle: {
          id: 'orders',
          domain: 'orders',
          label: 'Orders',
          x: 150,
          y: 120,
          r: 60,
          nodeIds: [],
        },
        width: 900,
        height: 700,
      }),
    ).toStrictEqual({
      scale: 2.2,
      translateX: 120,
      translateY: 86,
    })
  })
})
