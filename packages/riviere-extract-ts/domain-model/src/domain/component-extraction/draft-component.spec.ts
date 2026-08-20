import { describe, expect, it } from 'vitest'
import { DraftComponent } from './draft-component'
import { InvalidDraftComponentError } from './invalid-draft-component-error'

const validDraftComponent = {
  domain: 'orders',
  location: { file: 'src/orders.ts', line: 1 },
  module: 'orders',
  name: 'Order',
  type: 'domain',
}

describe('DraftComponent.parse', () => {
  it('creates a draft component from valid data', () => {
    expect(DraftComponent.parse(validDraftComponent)).toStrictEqual({
      success: true,
      data: expect.objectContaining(validDraftComponent),
    })
  })

  it.each([
    null,
    {},
    { ...validDraftComponent, type: undefined },
    { ...validDraftComponent, name: undefined },
    { ...validDraftComponent, domain: undefined },
    { ...validDraftComponent, module: undefined },
    { ...validDraftComponent, location: null },
    { ...validDraftComponent, location: { line: 1 } },
    { ...validDraftComponent, location: { file: 'src/orders.ts' } },
  ])('returns an error for invalid data', (input) => {
    expect(DraftComponent.parse(input)).toStrictEqual({
      success: false,
      error: 'Invalid draft component',
    })
  })

  it('throws the domain error when a caller requires valid data', () => {
    expect(() => DraftComponent.parseOrThrow({})).toThrow(InvalidDraftComponentError)
  })
})
