import type { Project } from 'ts-morph'
import type { EnrichedComponent } from '@living-architecture/riviere-extract-ts'
import {
  detectConnections,
  ConnectionDetectionError,
  matchesGlob,
} from '@living-architecture/riviere-extract-ts'
import { formatSuccess } from '../../../platform/infra/cli-presentation/output'
import { outputResult } from '../../../platform/infra/cli-presentation/output-writer'
import { exitWithConnectionDetectionFailure } from '../../../platform/infra/cli-presentation/exit-handlers'
import {
  countLinksByType,
  formatExtractionStats,
  formatTimingLine,
} from '../../../platform/infra/cli-presentation/format-extraction-stats'

interface ConnectionOutputOptions {
  allowIncomplete: boolean
  moduleGlobs: string[]
  stats: boolean
  output?: string | undefined
}

export function detectAndOutputConnections(
  project: Project,
  components: readonly EnrichedComponent[],
  options: ConnectionOutputOptions,
): void {
  const connectionResult = (() => {
    try {
      return detectConnections(
        project,
        components,
        {
          allowIncomplete: options.allowIncomplete,
          moduleGlobs: options.moduleGlobs,
        },
        matchesGlob,
      )
      /* v8 ignore start -- @preserve: ConnectionDetectionError catch tested via CLI integration in extract.connections.spec.ts */
    } catch (error) {
      if (error instanceof ConnectionDetectionError) {
        exitWithConnectionDetectionFailure(error.file, error.line, error.typeName, error.reason)
      }
      throw error
    }
    /* v8 ignore stop */
  })()

  const {
    links, timings 
  } = connectionResult

  console.error(formatTimingLine(timings))

  if (options.stats) {
    const statLines = formatExtractionStats(countLinksByType(components.length, links))
    for (const line of statLines) {
      console.error(line)
    }
  }

  const outputOptions = options.output === undefined ? {} : { output: options.output }
  outputResult(
    formatSuccess({
      components,
      links,
    }),
    outputOptions,
  )
}
