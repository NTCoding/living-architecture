import type { ValidatedModule } from '@living-architecture/riviere-extract-config-published-language'
import type { DraftComponent } from './component-extraction/draft-component'
import { extractComponents } from './component-extraction/extractor'
import type { ExtractionStage } from './extraction-stage'
import { OrphanedDraftComponentError } from './orphaned-draft-component-error'
import { enrichComponents } from './value-extraction/enrich-components'
import type { EnrichedComponent } from './value-extraction/enriched-component'

type ExtractComponentsForGraphResult =
  | {
      readonly ok: true
      readonly repository: string
      readonly components: EnrichedComponent[]
      readonly failedFields: string[]
    }
  | {
      readonly ok: false
      readonly failure: {
        readonly reason: string
        readonly failedFields?: string[]
      }
    }

/** @riviere-role domain-service */
export class ExtractComponentsForGraph {
  execute(
    stage: ExtractionStage,
    options: { readonly allowIncomplete: false },
  ): ExtractComponentsForGraphResult {
    const drafts = stage.moduleContexts.flatMap((context) =>
      extractComponents(context.project, [...context.files], context.module),
    )
    const enrichment = enrichDraftComponentValues(
      stage.resolvedConfig.modules,
      stage.moduleContexts,
      drafts,
      options.allowIncomplete,
    )

    if (enrichment.kind === 'fieldFailure') {
      return {
        ok: false,
        failure: {
          reason: 'Field enrichment failed',
          failedFields: enrichment.failedFields,
        },
      }
    }

    return {
      ok: true,
      repository: stage.repositoryName,
      components: enrichment.components,
      failedFields: enrichment.failedFields,
    }
  }
}

interface FieldFailureEnrichment {
  readonly kind: 'fieldFailure'
  readonly failedFields: string[]
}

interface SuccessfulEnrichment {
  readonly kind: 'enriched'
  readonly components: EnrichedComponent[]
  readonly failedFields: string[]
}

type EnrichmentResult = FieldFailureEnrichment | SuccessfulEnrichment

type ModuleContext = ExtractionStage['moduleContexts'][number]

function enrichDraftComponentValues(
  modules: readonly ValidatedModule[],
  moduleContexts: readonly ModuleContext[],
  draftComponents: readonly DraftComponent[],
  allowIncomplete: boolean,
): EnrichmentResult {
  const moduleNames = new Set(modules.map((module) => module.name))
  const draftsByModule = groupDraftsByModule(draftComponents)
  const orphanedModules = [...draftsByModule.keys()].filter((name) => !moduleNames.has(name))
  if (orphanedModules.length > 0) {
    throw new OrphanedDraftComponentError(orphanedModules, [...moduleNames])
  }

  const components: EnrichedComponent[] = []
  const failedFieldSet = new Set<string>()

  for (const module of modules) {
    const moduleDrafts = draftsByModule.get(module.name) ?? []
    if (moduleDrafts.length === 0) {
      continue
    }

    const context = moduleContexts.find((candidate) => candidate.module.name === module.name)
    /* v8 ignore start -- stage materialisation supplies one context for every configured module */
    if (context === undefined) {
      throw new TypeError(`Missing context for module '${module.name}'`)
    }
    /* v8 ignore stop */
    const result = enrichComponents(moduleDrafts, module, context.project)
    components.push(...result.components)
    for (const failure of result.failures) {
      failedFieldSet.add(failure.field)
    }
  }

  const failedFields = [...failedFieldSet]
  if (failedFields.length > 0 && !allowIncomplete) {
    return { kind: 'fieldFailure', failedFields }
  }

  return { kind: 'enriched', components, failedFields }
}

function groupDraftsByModule(drafts: readonly DraftComponent[]): Map<string, DraftComponent[]> {
  const grouped = new Map<string, DraftComponent[]>()
  for (const draft of drafts) {
    const existing = grouped.get(draft.module)
    if (existing !== undefined) {
      existing.push(draft)
      continue
    }
    grouped.set(draft.module, [draft])
  }
  return grouped
}
