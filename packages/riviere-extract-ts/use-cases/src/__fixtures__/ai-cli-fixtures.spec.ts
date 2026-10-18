import { describe, expect, it } from 'vitest'
import { unavailableAiCli } from './ai-cli-fixtures'

describe('unavailableAiCli', () => {
  it('reports an unavailable AI CLI with a specific reason', () => {
    expect(unavailableAiCli().checkAvailability('claude')).toStrictEqual({
      kind: 'unavailable',
      reason: 'AI CLI is not configured',
    })
  })
})
