import * as d3 from 'd3'
import {
  describe, expect, it 
} from 'vitest'
import { setupLinkLabels } from './GraphRenderingSetup'
import type { SimulationLink } from '../graph-types'

describe('relationship labels', () => {
  it('renders semantic type first with delivery and condition details', () => {
    const group = d3.select(document.body).append('svg').append('g')
    const links: SimulationLink[] = [
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

    setupLinkLabels(group, links)

    expect(group.select('text').text()).toBe('publishes · async · when on success')
  })

  it('renders only the semantic type with details available on hover', () => {
    const group = d3.select(document.body).append('svg').append('g')
    const links: SimulationLink[] = [
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

    setupLinkLabels(group, links, 'semantic-only')

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
    const links: SimulationLink[] = [
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

    setupLinkLabels(group, links)

    expect(group.selectAll('text').size()).toBe(0)
  })
})
