import * as d3 from 'd3'
import {
  describe, expect, it 
} from 'vitest'
import * as GraphRenderingSetup from './GraphRenderingSetup'
import type * as GraphTypes from '../graph-types'
import { parseNode } from '@/platform/infra/__fixtures__/riviere-test-fixtures'

describe('relationship labels', () => {
  it('renders semantic type first with delivery and condition details', () => {
    const group = d3.select(document.body).append('svg').append('g')
    const links: GraphTypes.SimulationLink[] = [
      {
        source: 'source',
        target: 'target',
        type: 'async',
        originalEdge: {
          source: 'source',
          target: 'target',
          type: 'async',
          relationshipType: 'publishes',
          condition: 'on success',
        },
      },
    ]

    GraphRenderingSetup.setupLinkLabels(group, links)

    expect(group.select('text').text()).toBe('publishes · async · when on success')
    expect(group.select('text').attr('dy')).toBe('0')
  })

  it('stacks labels for parallel relationships between the same nodes', () => {
    const group = d3.select(document.body).append('svg').append('g')
    const links: GraphTypes.SimulationLink[] = ['reads', 'writes', 'writes'].map(
      (relationshipType) => ({
        source: 'source',
        target: 'target',
        type: 'sync',
        originalEdge: {
          source: 'source',
          target: 'target',
          type: 'sync',
          relationshipType,
        },
      }),
    )

    GraphRenderingSetup.setupLinkLabels(group, links, 'semantic-only')

    const labels = group.selectAll<SVGTextElement, GraphTypes.SimulationLink>('text')
    expect(labels.filter((_link, index) => index === 0).attr('dy')).toBe('-16')
    expect(labels.filter((_link, index) => index === 1).attr('dy')).toBe('0')
    expect(labels.filter((_link, index) => index === 2).attr('dy')).toBe('16')
  })

  it('stacks labels when relationships run in opposite directions', () => {
    const group = d3.select(document.body).append('svg').append('g')
    const links: GraphTypes.SimulationLink[] = [
      {
        source: 'source',
        target: 'target',
        type: 'sync',
        originalEdge: {
          source: 'source',
          target: 'target',
          type: 'sync',
          relationshipType: 'queries',
        },
      },
      {
        source: 'target',
        target: 'source',
        type: 'sync',
        originalEdge: {
          source: 'target',
          target: 'source',
          type: 'sync',
          relationshipType: 'proxies',
        },
      },
    ]

    GraphRenderingSetup.setupLinkLabels(group, links, 'semantic-only')

    const labels = group.selectAll<SVGTextElement, GraphTypes.SimulationLink>('text')
    expect(labels.filter((_link, index) => index === 0).attr('dy')).toBe('-8')
    expect(labels.filter((_link, index) => index === 1).attr('dy')).toBe('8')
  })

  it('stacks labels when different relationships have the same rendered midpoint', () => {
    const group = d3.select(document.body).append('svg').append('g')
    const links: GraphTypes.SimulationLink[] = [
      {
        source: 'top-left',
        target: 'bottom-right',
        type: 'sync',
        originalEdge: {
          source: 'top-left',
          target: 'bottom-right',
          type: 'sync',
          relationshipType: 'reads',
        },
      },
      {
        source: 'bottom-left',
        target: 'top-right',
        type: 'sync',
        originalEdge: {
          source: 'bottom-left',
          target: 'top-right',
          type: 'sync',
          relationshipType: 'writes',
        },
      },
    ]
    const positions = [
      ['top-left', 0, 0],
      ['bottom-right', 100, 100],
      ['bottom-left', 0, 100],
      ['top-right', 100, 0],
    ] as const
    const nodePositionMap = new Map(
      positions.map(([id, x, y]) => [
        id,
        {
          id,
          x,
          y,
          type: 'Custom',
          name: id,
          domain: 'test',
          originalNode: parseNode({
            id,
            type: 'Custom',
            customTypeName: 'TestNode',
            name: id,
            domain: 'test',
            module: 'test',
            sourceLocation: {
              repository: 'test-repo',
              filePath: 'src/test.ts',
            },
          }),
        } satisfies GraphTypes.SimulationNode,
      ]),
    )
    const link = group
      .selectAll<SVGPathElement, GraphTypes.SimulationLink>('path')
      .data(links)
      .join('path')
    const linkLabel = GraphRenderingSetup.setupLinkLabels(group, links, 'semantic-only')
    const node = group.selectAll<SVGGElement, GraphTypes.SimulationNode>('g')

    GraphRenderingSetup.createUpdatePositionsFunction({
      link,
      linkLabel,
      node,
      nodePositionMap,
      getNodeRadius: () => 12,
    })()

    expect(linkLabel.filter((_link, index) => index === 0).attr('dy')).toBe('-8')
    expect(linkLabel.filter((_link, index) => index === 1).attr('dy')).toBe('8')
  })

  it('renders only the semantic type with details available on hover', () => {
    const group = d3.select(document.body).append('svg').append('g')
    const links: GraphTypes.SimulationLink[] = [
      {
        source: 'source',
        target: 'target',
        type: 'async',
        originalEdge: {
          source: 'source',
          target: 'target',
          type: 'async',
          relationshipType: 'publishes',
          condition: 'on success',
        },
      },
    ]

    GraphRenderingSetup.setupLinkLabels(group, links, 'semantic-only')

    const label = group.select('text')
    expect(label.html()).toBe('publishes<title>publishes · async · when on success</title>')
    expect(label.select('title').text()).toBe('publishes · async · when on success')
    expect(label.attr('aria-label')).toBe('publishes · async · when on success')
    expect({
      cursor: label.attr('cursor'),
      fontWeight: label.attr('font-weight'),
    }).toStrictEqual({
      cursor: 'help',
      fontWeight: '500',
    })
  })

  it('does not add a semantic label when the relationship type is absent', () => {
    const group = d3.select(document.body).append('svg').append('g')
    const links: GraphTypes.SimulationLink[] = [
      {
        source: 'source',
        target: 'target',
        type: 'sync',
        originalEdge: {
          source: 'source',
          target: 'target',
          type: 'sync',
        },
      },
    ]

    GraphRenderingSetup.setupLinkLabels(group, links)

    expect(group.selectAll('text').size()).toBe(0)
  })
})
