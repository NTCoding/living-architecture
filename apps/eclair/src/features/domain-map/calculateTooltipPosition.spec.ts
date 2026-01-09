import {
  describe, it, expect 
} from 'vitest'
import { calculateTooltipPositionWithViewportClipping } from './calculateTooltipPosition'

describe('calculateTooltipPositionWithViewportClipping', () => {
  const viewportWidth = 1000
  const viewportHeight = 800

  describe('horizontal positioning', () => {
    it('positions tooltip at cursor x when there is room on the right', () => {
      const result = calculateTooltipPositionWithViewportClipping(
        100,
        100,
        viewportWidth,
        viewportHeight,
      )

      expect(result).toStrictEqual({
        left: 100,
        top: 100,
      })
    })

    it('flips tooltip to left of cursor when it would overflow right edge', () => {
      const result = calculateTooltipPositionWithViewportClipping(
        900,
        100,
        viewportWidth,
        viewportHeight,
      )

      expect(result).toStrictEqual({
        left: 900 - 180 - 10,
        top: 100,
      })
    })

    it('flips at exact boundary where tooltip would overflow', () => {
      const result = calculateTooltipPositionWithViewportClipping(
        821,
        100,
        viewportWidth,
        viewportHeight,
      )

      expect(result).toStrictEqual({
        left: 821 - 180 - 10,
        top: 100,
      })
    })

    it('does not flip when tooltip fits exactly', () => {
      const result = calculateTooltipPositionWithViewportClipping(
        820,
        100,
        viewportWidth,
        viewportHeight,
      )

      expect(result).toStrictEqual({
        left: 820,
        top: 100,
      })
    })
  })

  describe('vertical positioning', () => {
    it('positions tooltip at cursor y when there is room below', () => {
      const result = calculateTooltipPositionWithViewportClipping(
        100,
        100,
        viewportWidth,
        viewportHeight,
      )

      expect(result).toStrictEqual({
        left: 100,
        top: 100,
      })
    })

    it('flips tooltip above cursor when it would overflow bottom edge', () => {
      const result = calculateTooltipPositionWithViewportClipping(
        100,
        750,
        viewportWidth,
        viewportHeight,
      )

      expect(result).toStrictEqual({
        left: 100,
        top: 750 - 60 - 10,
      })
    })

    it('flips at exact boundary where tooltip would overflow', () => {
      const result = calculateTooltipPositionWithViewportClipping(
        100,
        741,
        viewportWidth,
        viewportHeight,
      )

      expect(result).toStrictEqual({
        left: 100,
        top: 741 - 60 - 10,
      })
    })

    it('does not flip when tooltip fits exactly', () => {
      const result = calculateTooltipPositionWithViewportClipping(
        100,
        740,
        viewportWidth,
        viewportHeight,
      )

      expect(result).toStrictEqual({
        left: 100,
        top: 740,
      })
    })
  })

  describe('corner cases', () => {
    it('flips both directions when near bottom-right corner', () => {
      const result = calculateTooltipPositionWithViewportClipping(
        900,
        750,
        viewportWidth,
        viewportHeight,
      )

      expect(result).toStrictEqual({
        left: 900 - 180 - 10,
        top: 750 - 60 - 10,
      })
    })

    it('handles zero coordinates', () => {
      const result = calculateTooltipPositionWithViewportClipping(
        0,
        0,
        viewportWidth,
        viewportHeight,
      )

      expect(result).toStrictEqual({
        left: 0,
        top: 0,
      })
    })

    it('handles coordinates at origin with small viewport', () => {
      const result = calculateTooltipPositionWithViewportClipping(0, 0, 100, 50)

      expect(result).toStrictEqual({
        left: 0 - 180 - 10,
        top: 0 - 60 - 10,
      })
    })
  })
})
