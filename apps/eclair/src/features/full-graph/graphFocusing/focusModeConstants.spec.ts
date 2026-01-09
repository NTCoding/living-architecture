import {
  describe, expect, it 
} from 'vitest'
import {
  FOCUS_MODE_TRANSITIONS,
  FOCUS_MODE_NODE_SCALES,
  FOCUS_MODE_OPACITY,
  FOCUS_MODE_STROKES,
  FOCUS_MODE_TEXT,
  UNFOCUSED_NODE_STROKE_COLOR,
} from './focusModeConstants'

describe('focusModeConstants', () => {
  describe('FOCUS_MODE_TRANSITIONS', () => {
    it('defines element animation duration', () => {
      expect(FOCUS_MODE_TRANSITIONS.elementAnimation).toBe(600)
    })

    it('defines zoom animation duration', () => {
      expect(FOCUS_MODE_TRANSITIONS.zoomAnimation).toBe(750)
    })
  })

  describe('FOCUS_MODE_NODE_SCALES', () => {
    it('defines focused node radius multiplier', () => {
      expect(FOCUS_MODE_NODE_SCALES.focusedRadius).toBe(1.5)
    })

    it('defines unfocused node radius multiplier', () => {
      expect(FOCUS_MODE_NODE_SCALES.unfocusedRadius).toBe(0.7)
    })
  })

  describe('FOCUS_MODE_OPACITY', () => {
    it('defines unfocused node opacity as nearly invisible', () => {
      expect(FOCUS_MODE_OPACITY.unfocusedNode).toBe(0.02)
    })

    it('defines unfocused edge opacity as nearly invisible', () => {
      expect(FOCUS_MODE_OPACITY.unfocusedEdge).toBe(0.01)
    })

    it('defines focused node opacity as fully visible', () => {
      expect(FOCUS_MODE_OPACITY.focusedNode).toBe(1)
    })

    it('defines focused edge opacity as mostly visible', () => {
      expect(FOCUS_MODE_OPACITY.focusedEdge).toBe(0.8)
    })
  })

  describe('FOCUS_MODE_STROKES', () => {
    it('defines focused node stroke width as prominent', () => {
      expect(FOCUS_MODE_STROKES.focusedNodeWidth).toBe(4)
    })

    it('defines unfocused node stroke width as thin', () => {
      expect(FOCUS_MODE_STROKES.unfocusedNodeWidth).toBe(0.5)
    })

    it('defines focused edge stroke width as prominent', () => {
      expect(FOCUS_MODE_STROKES.focusedEdgeWidth).toBe(3)
    })

    it('defines unfocused edge stroke width as thin', () => {
      expect(FOCUS_MODE_STROKES.unfocusedEdgeWidth).toBe(1)
    })
  })

  describe('FOCUS_MODE_TEXT', () => {
    it('defines focused label size as larger', () => {
      expect(FOCUS_MODE_TEXT.focusedLabelSize).toBe('13px')
    })

    it('defines unfocused label size as standard', () => {
      expect(FOCUS_MODE_TEXT.unfocusedLabelSize).toBe('11px')
    })

    it('defines focused label weight as bold', () => {
      expect(FOCUS_MODE_TEXT.focusedLabelWeight).toBe(700)
    })

    it('defines unfocused label weight as semi-bold', () => {
      expect(FOCUS_MODE_TEXT.unfocusedLabelWeight).toBe(600)
    })

    it('defines focused domain label size', () => {
      expect(FOCUS_MODE_TEXT.focusedDomainSize).toBe('11px')
    })

    it('defines unfocused domain label size as small', () => {
      expect(FOCUS_MODE_TEXT.unfocusedDomainSize).toBe('9px')
    })

    it('defines focused domain label weight as bold', () => {
      expect(FOCUS_MODE_TEXT.focusedDomainWeight).toBe(700)
    })

    it('defines unfocused domain label weight as medium', () => {
      expect(FOCUS_MODE_TEXT.unfocusedDomainWeight).toBe(500)
    })
  })

  describe('UNFOCUSED_NODE_STROKE_COLOR', () => {
    it('defines unfocused node stroke as transparent gray', () => {
      expect(UNFOCUSED_NODE_STROKE_COLOR).toBe('rgba(128, 128, 128, 0.1)')
    })
  })
})
