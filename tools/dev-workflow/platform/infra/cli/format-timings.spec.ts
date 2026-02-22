import {
  describe, it, expect 
} from 'vitest'
import { formatTimingsMarkdown } from './format-timings'

describe('formatTimingsMarkdown', () => {
  it('formats step timings as markdown table', () => {
    const result = formatTimingsMarkdown(
      [
        {
          name: 'verify-build',
          durationMs: 45200,
        },
        {
          name: 'code-review',
          durationMs: 38700,
        },
      ],
      83900,
    )

    expect(result).toContain('| verify-build | 45.2s |')
    expect(result).toContain('| code-review | 38.7s |')
    expect(result).toContain('**Total: 83.9s**')
  })

  it('formats sub-second durations in milliseconds', () => {
    const result = formatTimingsMarkdown(
      [
        {
          name: 'fast-step',
          durationMs: 42,
        },
      ],
      42,
    )

    expect(result).toContain('| fast-step | 42ms |')
    expect(result).toContain('**Total: 42ms**')
  })
})
