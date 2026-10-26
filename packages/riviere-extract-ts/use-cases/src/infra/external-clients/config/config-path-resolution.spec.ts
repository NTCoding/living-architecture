import { describe, expect, it } from 'vitest'

import { resolveAiConfig } from './config-path-resolution'

describe('resolveAiConfig', () => {
  it('resolves sources against the config directory', () => {
    const resolved = resolveAiConfig(
      { sources: ['src/orders.ts'], context: { exclude: [] } },
      '/repo',
    )

    expect(resolved.sources).toStrictEqual(['/repo/src/orders.ts'])
  })

  it('resolves exclude patterns against the config directory', () => {
    const resolved = resolveAiConfig(
      { sources: ['src/orders.ts'], context: { exclude: ['src/ignored'] } },
      '/repo',
    )

    expect(resolved.context.exclude).toStrictEqual(['/repo/src/ignored'])
  })

  it('resolves memory and prompt-append when present', () => {
    const resolved = resolveAiConfig(
      {
        sources: ['src/orders.ts'],
        memory: 'memory.md',
        promptAppend: 'append.md',
        context: { exclude: [] },
      },
      '/repo',
    )

    expect(resolved.memory).toBe('/repo/memory.md')
    expect(resolved.promptAppend).toBe('/repo/append.md')
  })
})
