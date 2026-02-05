import {
  describe, it, expect 
} from 'vitest'
import {
  countLinksByType,
  formatExtractionStats,
  formatTimingLine,
} from './format-extraction-stats'

describe('formatExtractionStats', () => {
  it('formats stats with sync and async links', () => {
    const lines = formatExtractionStats({
      componentCount: 5,
      linkCount: 3,
      syncLinkCount: 2,
      asyncLinkCount: 1,
      uncertainLinkCount: 0,
    })

    expect(lines).toStrictEqual(['Components: 5', 'Links: 3 (sync: 2, async: 1)', 'Uncertain: 0'])
  })

  it('formats stats with zero links', () => {
    const lines = formatExtractionStats({
      componentCount: 2,
      linkCount: 0,
      syncLinkCount: 0,
      asyncLinkCount: 0,
      uncertainLinkCount: 0,
    })

    expect(lines).toStrictEqual(['Components: 2', 'Links: 0 (sync: 0, async: 0)', 'Uncertain: 0'])
  })

  it('formats stats with uncertain links', () => {
    const lines = formatExtractionStats({
      componentCount: 4,
      linkCount: 5,
      syncLinkCount: 3,
      asyncLinkCount: 2,
      uncertainLinkCount: 2,
    })

    expect(lines).toStrictEqual(['Components: 4', 'Links: 5 (sync: 3, async: 2)', 'Uncertain: 2'])
  })

  it('formats components-only stats without link information', () => {
    const lines = formatExtractionStats({
      componentCount: 7,
      linkCount: undefined,
      syncLinkCount: undefined,
      asyncLinkCount: undefined,
      uncertainLinkCount: undefined,
    })

    expect(lines).toStrictEqual(['Components: 7'])
  })
})

describe('countLinksByType', () => {
  it('counts sync, async, and uncertain links', () => {
    const links = [
      {
        source: 'a',
        target: 'b',
        type: 'sync' as const,
      },
      {
        source: 'c',
        target: 'd',
        type: 'async' as const,
      },
      {
        source: 'e',
        target: 'f',
        type: 'sync' as const,
        _uncertain: 'reason',
      },
    ]

    expect(countLinksByType(5, links)).toStrictEqual({
      componentCount: 5,
      linkCount: 3,
      syncLinkCount: 2,
      asyncLinkCount: 1,
      uncertainLinkCount: 1,
    })
  })

  it('returns zero counts for empty links array', () => {
    expect(countLinksByType(3, [])).toStrictEqual({
      componentCount: 3,
      linkCount: 0,
      syncLinkCount: 0,
      asyncLinkCount: 0,
      uncertainLinkCount: 0,
    })
  })
})

describe('formatTimingLine', () => {
  it('formats timing with millisecond values as seconds', () => {
    const line = formatTimingLine({
      callGraphMs: 800,
      asyncDetectionMs: 300,
      setupMs: 130,
      totalMs: 1230,
    })

    expect(line).toBe(
      'Extraction completed in 1.23s (call graph: 0.80s, detection: 0.30s, setup: 0.13s)',
    )
  })

  it('formats timing with zero values', () => {
    const line = formatTimingLine({
      callGraphMs: 0,
      asyncDetectionMs: 0,
      setupMs: 0,
      totalMs: 0,
    })

    expect(line).toBe(
      'Extraction completed in 0.00s (call graph: 0.00s, detection: 0.00s, setup: 0.00s)',
    )
  })

  it('truncates sub-millisecond values to zero', () => {
    const line = formatTimingLine({
      callGraphMs: 1.5,
      asyncDetectionMs: 0.3,
      setupMs: 0.2,
      totalMs: 2.1,
    })

    expect(line).toBe(
      'Extraction completed in 0.00s (call graph: 0.00s, detection: 0.00s, setup: 0.00s)',
    )
  })
})
