import {
  enrichComponents,
  matchesGlob,
  type DraftComponent,
  type EnrichedComponent,
} from '@living-architecture/riviere-extract-ts'
import type { ExtractionProject } from './extraction-project'

/** @riviere-role value-object */
export class OrphanedDraftComponentError extends Error {
  constructor(orphanedModules: string[], knownModules: string[]) {
    super(
      `Draft components reference unknown modules: [${orphanedModules.join(', ')}]. Known modules: [${knownModules.join(', ')}]`,
    )
    this.name = 'OrphanedDraftComponentError'
  }
}

/** @riviere-role value-object */
export interface PerModuleEnrichmentResult {
  components: EnrichedComponent[]
  failedFields: string[]
}

/** @riviere-role domain-service */
export function enrichPerModule(
  extractionProject: ExtractionProject,
  draftComponents: DraftComponent[],
): PerModuleEnrichmentResult {
  const moduleNames = new Set(extractionProject.moduleContexts.map((ctx) => ctx.module.name))
  const draftsByModule = groupDraftsByModule(draftComponents)
  assertAllDraftsMatchModules(draftsByModule, moduleNames)
  const components: EnrichedComponent[] = []
  const failedFieldSet = new Set<string>()
  for (const ctx of extractionProject.moduleContexts) {
    const moduleDrafts = draftsByModule.get(ctx.module.name) ?? []
    if (moduleDrafts.length === 0) {
      continue
    }

    const result = enrichComponents(
      moduleDrafts,
      extractionProject.resolvedConfig,
      ctx.project,
      matchesGlob,
      extractionProject.configDir,
    )
    components.push(...result.components)
    for (const f of result.failures) {
      failedFieldSet.add(f.field)
    }
  }
  return {
    components,
    failedFields: [...failedFieldSet],
  }
}

function assertAllDraftsMatchModules(
  draftsByModule: Map<string, DraftComponent[]>,
  moduleNames: Set<string>,
): void {
  const orphanedModules = [...draftsByModule.keys()].filter((name) => !moduleNames.has(name))
  if (orphanedModules.length > 0) {
    throw new OrphanedDraftComponentError(orphanedModules, [...moduleNames])
  }
}

function groupDraftsByModule(drafts: DraftComponent[]): Map<string, DraftComponent[]> {
  const grouped = new Map<string, DraftComponent[]>()
  for (const draft of drafts) {
    const existing = grouped.get(draft.domain)
    if (existing) {
      existing.push(draft)
    } else {
      grouped.set(draft.domain, [draft])
    }
  }
  return grouped
}
