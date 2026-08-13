import { expect, it, vi } from 'vitest'

interface MockValidate {
  (value: unknown): false
  errors: null | { instancePath: string }[]
}

vi.mock('ajv', () => ({
  default: class {
    compile() {
      const validate: MockValidate = Object.assign(
        (value: unknown) => {
          validate.errors = value === 'missing-message' ? [{ instancePath: '/version' }] : null
          return false
        },
        { errors: null },
      )
      return validate
    }
  },
}))
vi.mock('ajv-formats', () => ({ default: vi.fn() }))

it('returns a generic issue when validation fails without details', async () => {
  const { parseRiviereGraph } = await import('./published-language/validation')

  expect(parseRiviereGraph({})).toStrictEqual({
    success: false,
    issues: ['validation failed without specific issues'],
  })
})

it('uses a fallback for an issue without a message', async () => {
  const { parseRiviereGraph } = await import('./published-language/validation')

  expect(parseRiviereGraph('missing-message')).toStrictEqual({
    success: false,
    issues: ['/version: invalid value'],
  })
})
