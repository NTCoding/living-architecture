import {
  describe, it, expect, vi 
} from 'vitest'
import { CSSModuleError } from '@/errors'

vi.mock('./SchemaModal.module.css', () => ({
  default: {
    jsonContainer: 'mocked-container',
    // Missing other required classes to trigger error
  },
}))

describe('SchemaModal CSS module validation', () => {
  it('throws CSSModuleError with class name when required CSS class is missing', async () => {
    const importAttempt = import('./SchemaModal')
    await expect(importAttempt).rejects.toThrow(CSSModuleError)
    await expect(importAttempt).rejects.toThrow('jsonBasicChild')
  })
})
