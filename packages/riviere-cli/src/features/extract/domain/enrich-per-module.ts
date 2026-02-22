import type { ResolvedExtractionConfig } from '@living-architecture/riviere-extract-config'
import {
  enrichComponents,
  matchesGlob,
  type DraftComponent,
  type EnrichedComponent,
} from '@living-architecture/riviere-extract-ts'
import type { ModuleContext } from './extract-draft-components'

export interface PerModuleEnrichmentResult {
  components: EnrichedComponent[]
  failedFields: string[]
}

export function enrichPerModule(
  moduleContexts: ModuleContext[],
  draftComponents: DraftComponent[],
  resolvedConfig: ResolvedExtractionConfig,
  configDir: string,
): PerModuleEnrichmentResult {
  const components: EnrichedComponent[] = []
  const failedFields: string[] = []
  for (const ctx of moduleContexts) {
    const moduleDrafts = draftComponents.filter((d) => d.domain === ctx.module.name)
    if (moduleDrafts.length === 0) {
      continue
    }

    const result = enrichComponents(
      moduleDrafts,
      resolvedConfig,
      ctx.project,
      matchesGlob,
      configDir,
    )
    components.push(...result.components)
    failedFields.push(...result.failures.map((f) => f.field))
  }
  return {
    components,
    failedFields,
  }
}
