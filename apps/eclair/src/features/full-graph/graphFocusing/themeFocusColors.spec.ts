import {
  describe, expect, it 
} from 'vitest'
import { getThemeFocusColors } from './themeFocusColors'

describe('getThemeFocusColors', () => {
  it('returns stream colors when theme is stream', () => {
    const colors = getThemeFocusColors('stream')

    expect(colors.borderColor).toBe('#06B6D4')
    expect(colors.glowColor).toBe('#06B6D4')
    expect(colors.shadowColor).toBe('rgba(6, 182, 212, 0.5)')
    expect(colors.overlayBackground).toBe('rgba(248, 250, 252, 0.4)')
  })

  it('returns voltage colors when theme is voltage', () => {
    const colors = getThemeFocusColors('voltage')

    expect(colors.borderColor).toBe('#00D4FF')
    expect(colors.glowColor).toBe('#00D4FF')
    expect(colors.shadowColor).toBe('rgba(0, 212, 255, 0.6)')
    expect(colors.overlayBackground).toBe('rgba(10, 10, 15, 0.6)')
  })

  it('returns circuit colors when theme is circuit', () => {
    const colors = getThemeFocusColors('circuit')

    expect(colors.borderColor).toBe('#0969DA')
    expect(colors.glowColor).toBe('#0969DA')
    expect(colors.shadowColor).toBe('rgba(9, 105, 218, 0.6)')
    expect(colors.overlayBackground).toBe('rgba(246, 248, 250, 0.4)')
  })

  it('returns all required properties', () => {
    const colors = getThemeFocusColors('stream')

    expect(colors).toHaveProperty('borderColor')
    expect(colors).toHaveProperty('glowColor')
    expect(colors).toHaveProperty('shadowColor')
    expect(colors).toHaveProperty('overlayBackground')
  })
})
