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
    const draftsByModule = extractDraftsByModule(stage)
    const enrichment = enrichDraftComponentValues(
      stage.resolvedConfig.modules,
      stage.moduleContexts,
      draftsByModule,
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
  draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>,
  allowIncomplete: boolean,
): EnrichmentResult {
  const components: EnrichedComponent[] = []
  const failedFieldSet = new Set<string>()

  for (const module of modules) {
    /* v8 ignore start -- extractDraftsByModule materialises every configured module */
    const moduleDrafts = draftsByModule.get(module.name) ?? []
    /* v8 ignore stop */
    if (moduleDrafts.length === 0) {
      continue
    }

    const context = contextForModule(moduleContexts, module)
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

function extractDraftsByModule(stage: ExtractionStage): Map<string, DraftComponent[]> {
  const grouped = new Map<string, DraftComponent[]>()
  for (const context of stage.moduleContexts) {
    const drafts = extractComponents(context.project, [...context.files], context.module)
    const orphanedModules = drafts
      .filter((draft) => draft.domain !== context.module.domain)
      .map((draft) => draft.module)
    if (orphanedModules.length > 0) {
      throw new OrphanedDraftComponentError(orphanedModules, [context.module.name])
    }
    grouped.set(context.module.name, drafts)
  }
  return grouped
}

function contextForModule(
  contexts: readonly ModuleContext[],
  module: ValidatedModule,
): ModuleContext {
  const context = contexts.find((candidate) => candidate.module.name === module.name)
  /* v8 ignore start -- ExtractionStage.parse rejects missing configured contexts */
  if (context === undefined) {
    throw new TypeError(`Missing context for module '${module.name}'`)
  }
  /* v8 ignore stop */
  return context
}
