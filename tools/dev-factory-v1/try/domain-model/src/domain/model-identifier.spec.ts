import { describe, expect, it } from 'vitest'
import { ModelIdentifier } from './model-identifier'

describe('ModelIdentifier', () => {
  it('accepts a provider and a model name', () => {
    expect(ModelIdentifier.parse('anthropic/claude-sonnet-4-6').value()).toBe(
      'anthropic/claude-sonnet-4-6',
    )
  })

  it('accepts a model name with dots', () => {
    expect(ModelIdentifier.parse('deepseek/deepseek-v4.1-flash').value()).toBe(
      'deepseek/deepseek-v4.1-flash',
    )
  })

  it('rejects a value without a provider', () => {
    expect(() => ModelIdentifier.parse('claude-sonnet-4-6')).toThrow(
      'A model identifier is provider/model',
    )
  })
})
