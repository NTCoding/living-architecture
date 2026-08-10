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
