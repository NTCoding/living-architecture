import { describe, expect, it } from 'vitest'
import { ExtractionContext, ExtractionResult } from './extraction-result'

describe('ExtractionContext', () => {
  it('stores file path when constructed', () => {
    const result = ExtractionContext.parse({ filePath: '/src/orders/order-service.ts' })

    expect(result.filePath).toBe('/src/orders/order-service.ts')
  })
})

describe('ExtractionResult', () => {
  it('stores extracted value when constructed', () => {
    const result = ExtractionResult.parse({ value: 'orders' })

    expect(result.value).toBe('orders')
  })
})
