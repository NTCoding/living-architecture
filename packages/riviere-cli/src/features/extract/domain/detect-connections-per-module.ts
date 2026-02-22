import { posix } from 'node:path'
import {
  deduplicateCrossStrategy,
  detectCrossModuleConnections,
  detectPerModuleConnections,
  matchesGlob,
  type ConnectionTimings,
  type EnrichedComponent,
  type ExtractedLink,
} from '@living-architecture/riviere-extract-ts'
import type { ModuleContext } from './extract-draft-components'

export interface PerModuleConnectionResult {
  links: ExtractedLink[]
  timings: ConnectionTimings[]
}

export function detectConnectionsPerModule(
  moduleContexts: ModuleContext[],
  enrichedComponents: EnrichedComponent[],
  repositoryName: string,
  allowIncomplete: boolean,
): PerModuleConnectionResult {
  const links: ExtractedLink[] = []
  const timings: ConnectionTimings[] = []

  for (const ctx of moduleContexts) {
    const moduleComponents = enrichedComponents.filter((c) => c.domain === ctx.module.name)
    if (moduleComponents.length === 0) {
      continue
    }

    const result = detectPerModuleConnections(
      ctx.project,
      moduleComponents,
      {
        allowIncomplete,
        moduleGlobs: [posix.join(ctx.module.path, ctx.module.glob)],
        repository: repositoryName,
      },
      matchesGlob,
    )
    links.push(...result.links)
    timings.push({
      callGraphMs: result.timings.callGraphMs,
      asyncDetectionMs: 0,
      configurableMs: result.timings.configurableMs,
      setupMs: result.timings.setupMs,
      totalMs: result.timings.callGraphMs + result.timings.configurableMs + result.timings.setupMs,
    })
  }

  const crossResult = detectCrossModuleConnections(enrichedComponents, {
    allowIncomplete,
    repository: repositoryName,
  })
  links.push(...crossResult.links)
  timings.push({
    callGraphMs: 0,
    asyncDetectionMs: crossResult.timings.asyncDetectionMs,
    configurableMs: 0,
    setupMs: 0,
    totalMs: crossResult.timings.asyncDetectionMs,
  })

  return {
    links: deduplicateCrossStrategy(links),
    timings,
  }
}
