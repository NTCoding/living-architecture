import {
  describe, expect, it 
} from 'vitest'
import {
  buildAddComponentCommandInput,
  getValidComponentTypes,
  InvalidComponentTypeOptionError,
  InvalidLineNumberError,
  type AddComponentCliOptions,
} from './add-component-command-input'

function createOptions(overrides: Partial<AddComponentCliOptions> = {}): AddComponentCliOptions {
  return {
    type: 'UI',
    name: 'Checkout Page',
    domain: 'orders',
    module: 'checkout',
    repository: 'https://github.com/org/repo',
    filePath: 'src/checkout/page.tsx',
    customProperty: [],
    json: false,
    ...overrides,
  }
}

describe('buildAddComponentCommandInput', () => {
  it('builds command input with optional fields', () => {
    const result = buildAddComponentCommandInput(
      createOptions({
        route: '/checkout',
        description: 'Checkout UI',
        lineNumber: '42',
      }),
    )

    expect(result.graphPath).toContain('.riviere/graph.json')
    expect(result.component).toMatchObject({
      type: 'UI',
      input: {
        route: '/checkout',
        description: 'Checkout UI',
        sourceLocation: {
          filePath: 'src/checkout/page.tsx',
          lineNumber: 42,
          repository: 'https://github.com/org/repo',
        },
      },
    })
  })

  it('includes custom properties when provided', () => {
    const result = buildAddComponentCommandInput(
      createOptions({
        type: 'Custom',
        customType: 'BackgroundJob',
        customProperty: ['schedule:0 0 * * *'],
      }),
    )

    expect(result.component).toMatchObject({
      type: 'Custom',
      input: {
        customTypeName: 'BackgroundJob',
        metadata: { schedule: '0 0 * * *' },
      },
    })
  })

  it('throws InvalidComponentTypeOptionError for invalid type', () => {
    expect(() => buildAddComponentCommandInput(createOptions({ type: 'SoapApi' }))).toThrow(
      InvalidComponentTypeOptionError,
    )
  })

  it('throws InvalidLineNumberError for invalid line number', () => {
    expect(() => buildAddComponentCommandInput(createOptions({ lineNumber: '0' }))).toThrow(
      InvalidLineNumberError,
    )
  })

  it('returns valid component types', () => {
    expect(getValidComponentTypes()).toContain('UI')
    expect(getValidComponentTypes()).toContain('Custom')
  })
})
