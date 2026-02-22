import { posix } from 'node:path'
import {
  detectConnections,
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

    const result = detectConnections(
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
    timings.push(result.timings)
  }
  return {
    links,
    timings,
  }
}
