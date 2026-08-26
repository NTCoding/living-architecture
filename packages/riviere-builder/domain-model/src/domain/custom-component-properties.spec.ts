import { CustomComponentProperties } from './custom-component-properties'
import { ExistingValuePreference } from './existing-value-preference'

describe('CustomComponentProperties', () => {
  it('combines nested properties, unique arrays, and scalar replacements', () => {
    const existing = CustomComponentProperties.parse({
      owner: 'orders',
      settings: { retries: 3 },
      labels: ['critical', { name: 'internal' }],
    })
    const combined = existing.including(
      CustomComponentProperties.parse({
        owner: 'platform',
        settings: { timeout: 1000 },
        labels: ['critical', { name: 'internal' }, 'public'],
      }),
      ExistingValuePreference.parse(false),
    )
    expect(combined.properties.published()).toStrictEqual({
      owner: 'platform',
      settings: { retries: 3, timeout: 1000 },
      labels: ['critical', { name: 'internal' }, 'public'],
    })
    expect(combined.replacements).toStrictEqual([
      { field: 'metadata.owner', oldValue: 'orders', newValue: 'platform' },
    ])
  })

  it('preserves values and ignores absent incoming properties', () => {
    const combined = CustomComponentProperties.parse({
      owner: 'orders',
      settings: 'legacy',
    }).including(
      CustomComponentProperties.parse({
        owner: 'platform',
        settings: { retries: 3 },
        absent: null,
      }),
      ExistingValuePreference.parse(true),
    )
    expect(combined.properties.published()).toStrictEqual({
      owner: 'orders',
      settings: { retries: 3 },
    })
    expect(combined.replacements).toStrictEqual([])
  })

  it('accepts missing property collections and arrays replacing non arrays', () => {
    const combined = CustomComponentProperties.parse(undefined).including(
      CustomComponentProperties.parse({ labels: ['first', 'first'] }),
      ExistingValuePreference.parse(false),
    )
    expect(combined.properties.published()).toStrictEqual({ labels: ['first'] })
  })
})
