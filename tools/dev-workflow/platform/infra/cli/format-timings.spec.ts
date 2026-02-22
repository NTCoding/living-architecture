import {
  describe, it, expect 
} from 'vitest'
import { formatTimingsMarkdown } from './format-timings'

describe('formatTimingsMarkdown', () => {
  it('includes markdown table structure', () => {
    const result = formatTimingsMarkdown(
      [
        {
          name: 'step1',
          durationMs: 1000,
        },
      ],
      1000,
    )

    expect(result).toContain('# Workflow Timing')
    expect(result).toContain('| Step | Duration |')
    expect(result).toContain('|------|----------|')
  })

  it('formats step durations in seconds and total', () => {
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

  it('renders table structure with no data rows when empty', () => {
    const result = formatTimingsMarkdown([], 0)

    expect(result).toContain('| Step | Duration |')
    expect(result).not.toMatch(/\| .+ \| \d/)
    expect(result).toContain('**Total: 0ms**')
  })
})
