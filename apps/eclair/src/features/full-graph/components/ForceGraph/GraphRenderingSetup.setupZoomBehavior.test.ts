import {
  describe, it, expect, vi 
} from 'vitest'
import * as d3 from 'd3'
import { setupZoomBehavior } from './GraphRenderingSetup'

describe('GraphRenderingSetup', () => {
  describe('setupZoomBehavior', () => {
    function createTestSvgAndGroup(): {
      svg: d3.Selection<SVGSVGElement, unknown, null, undefined>
      g: d3.Selection<SVGGElement, unknown, null, undefined>
    } {
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      document.body.appendChild(svgElement)
      const svg = d3.select(svgElement)
      const g = svg.append('g')
      return {
        svg,
        g,
      }
    }

    it('accepts onInteractionStart option without throwing', () => {
      const {
        svg, g 
      } = createTestSvgAndGroup()
      const onInteractionStart = vi.fn()

      expect(() => setupZoomBehavior(svg, g, { onInteractionStart })).not.toThrow()

      svg.node()?.remove()
    })

    it('works without options parameter', () => {
      const {
        svg, g 
      } = createTestSvgAndGroup()

      expect(() => setupZoomBehavior(svg, g)).not.toThrow()

      svg.node()?.remove()
    })

    it('returns a zoom behavior object', () => {
      const {
        svg, g 
      } = createTestSvgAndGroup()

      const zoom = setupZoomBehavior(svg, g)

      expect(zoom).toBeDefined()
      expect(zoom.scaleExtent).toBeDefined()

      svg.node()?.remove()
    })
  })
})
