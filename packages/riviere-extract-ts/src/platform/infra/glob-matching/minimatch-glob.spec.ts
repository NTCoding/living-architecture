import {
  describe, it, expect 
} from 'vitest'
import { matchesGlob } from './minimatch-glob'

describe('matchesGlob', () => {
  it('returns true when path matches glob pattern', () => {
    expect(matchesGlob('orders/use-cases/create-order.ts', 'orders/**')).toBe(true)
  })

  it('returns false when path does not match glob pattern', () => {
    expect(matchesGlob('shipping/handlers/ship.ts', 'orders/**')).toBe(false)
  })

  it('matches exact file name', () => {
    expect(matchesGlob('index.ts', 'index.ts')).toBe(true)
  })

  it('matches nested glob patterns', () => {
    expect(matchesGlob('src/orders/api/controller.ts', 'src/**/api/**')).toBe(true)
  })
})
