import type {
  ConnectionTimings, ExtractedLink 
} from '@living-architecture/riviere-extract-ts'

interface ExtractionStatsInput {
  componentCount: number
  linkCount: number | undefined
  syncLinkCount: number | undefined
  asyncLinkCount: number | undefined
  uncertainLinkCount: number | undefined
}

/** @riviere-role cli-output-formatter */
export function countLinksByType(
  componentCount: number,
  links: readonly ExtractedLink[],
): ExtractionStatsInput {
  const syncLinkCount = links.filter((l) => l.type === 'sync').length
  const asyncLinkCount = links.filter((l) => l.type === 'async').length
  const uncertainLinkCount = links.filter((l) => l._uncertain !== undefined).length
  return {
    componentCount,
    linkCount: links.length,
    syncLinkCount,
    asyncLinkCount,
    uncertainLinkCount,
  }
}

function formatSeconds(ms: number): string {
  return (ms / 1000).toFixed(2) + 's'
}

/** @riviere-role cli-output-formatter */
export function formatExtractionStats(stats: ExtractionStatsInput): string[] {
  const lines: string[] = [`Components: ${stats.componentCount}`]
  if (stats.linkCount !== undefined) {
    lines.push(
      `Links: ${stats.linkCount} (sync: ${stats.syncLinkCount}, async: ${stats.asyncLinkCount})`,
    )
    lines.push(`Uncertain: ${stats.uncertainLinkCount}`)
  }
  return lines
}

/** @riviere-role cli-output-formatter */
export function formatTimingLine(timings: ConnectionTimings): string {
  return `Extraction completed in ${formatSeconds(timings.totalMs)} (call graph: ${formatSeconds(timings.callGraphMs)}, detection: ${formatSeconds(timings.asyncDetectionMs)}, setup: ${formatSeconds(timings.setupMs)})`
}
