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
  it('throws CSSModuleError when required CSS class is missing', async () => {
    await expect(async () => import('./SchemaModal')).rejects.toThrow(CSSModuleError)
  })

  it('throws CSSModuleError with class name in message', async () => {
    await expect(async () => import('./SchemaModal')).rejects.toThrow('jsonBasicChild')
  })
})
