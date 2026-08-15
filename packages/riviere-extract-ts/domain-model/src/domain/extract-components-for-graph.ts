import type { ValidatedModule } from '@living-architecture/riviere-extract-config-published-language'
import type { Project } from 'ts-morph'
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
        readonly failedFields: string[]
      }
    }

/** @riviere-role domain-service */
export class ExtractComponentsForGraph {
  execute(
    stage: ExtractionStage,
    options: { readonly allowIncomplete: false },
  ): ExtractComponentsForGraphResult {
    const draftsByModule = extractDraftsByModule(stage)
    return buildGraphExtractionResult(stage, draftsByModule, options.allowIncomplete)
  }
}

function buildGraphExtractionResult(
  stage: ExtractionStage,
  draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>,
  allowIncomplete: false,
): ExtractComponentsForGraphResult {
  const enrichment = enrichComponentsForModules(
    stage.resolvedConfig.modules,
    stage.moduleContexts,
    draftsByModule,
    allowIncomplete,
  )
  return enrichment.kind === 'fieldFailure'
    ? failedGraphExtraction(enrichment.failedFields)
    : successfulGraphExtraction(stage.repositoryName, enrichment)
}

function failedGraphExtraction(failedFields: string[]): ExtractComponentsForGraphResult {
  return {
    ok: false,
    failure: {
      reason: 'Field enrichment failed',
      failedFields,
    },
  }
}

function successfulGraphExtraction(
  repository: string,
  enrichment: SuccessfulEnrichment,
): ExtractComponentsForGraphResult {
  return {
    ok: true,
    repository,
    components: enrichment.components,
    failedFields: enrichment.failedFields,
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

type EnrichmentModuleContext = {
  readonly module: ValidatedModule
  readonly project: Project
}

type ModuleContext = ExtractionStage['moduleContexts'][number]

/** @riviere-role domain-service */
export function enrichComponentsForModules(
  modules: readonly ValidatedModule[],
  moduleContexts: readonly EnrichmentModuleContext[],
  draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>,
  allowIncomplete: boolean,
): EnrichmentResult {
  assertAllDraftsMatchModules(draftsByModule, modules)
  const results = modules.map((module) => enrichModule(module, moduleContexts, draftsByModule))
  const components = results.flatMap((result) => result.components)
  const failedFields = [...new Set(results.flatMap((result) => result.failedFields))]
  if (failedFields.length > 0 && !allowIncomplete) {
    return { kind: 'fieldFailure', failedFields }
  }

  return { kind: 'enriched', components, failedFields }
}

function assertAllDraftsMatchModules(
  draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>,
  modules: readonly ValidatedModule[],
): void {
  const knownModuleNames = new Set(modules.map((module) => module.name))
  const orphanedModules = [...draftsByModule.keys()].filter((name) => !knownModuleNames.has(name))
  if (orphanedModules.length > 0) {
    throw new OrphanedDraftComponentError(orphanedModules, [...knownModuleNames])
  }
}

interface ModuleEnrichment {
  readonly components: EnrichedComponent[]
  readonly failedFields: string[]
}

function enrichModule(
  module: ValidatedModule,
  moduleContexts: readonly EnrichmentModuleContext[],
  draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>,
): ModuleEnrichment {
  const context = contextForModule(moduleContexts, module)
  const moduleDrafts = draftsByModule.get(module.name) ?? []
  if (moduleDrafts.length === 0) {
    return { components: [], failedFields: [] }
  }

  const result = enrichComponents(moduleDrafts, module, context.project)
  return {
    components: result.components,
    failedFields: result.failures.map((failure) => failure.field),
  }
}

function extractDraftsByModule(stage: ExtractionStage): Map<string, DraftComponent[]> {
  const grouped = new Map<string, DraftComponent[]>()
  for (const context of stage.moduleContexts) {
    grouped.set(context.module.name, extractModuleDrafts(context))
  }
  return grouped
}

function extractModuleDrafts(context: ModuleContext): DraftComponent[] {
  const drafts = extractComponents(context.project, [...context.files], context.module)
  const orphanedModules = drafts
    .filter((draft) => draft.domain !== context.module.domain)
    .map((draft) => draft.module)
  if (orphanedModules.length > 0) {
    throw new OrphanedDraftComponentError(orphanedModules, [context.module.name])
  }
  return drafts
}

function contextForModule(
  contexts: readonly EnrichmentModuleContext[],
  module: ValidatedModule,
): EnrichmentModuleContext {
  const context = contexts.find((candidate) => candidate.module.name === module.name)
  if (context === undefined) {
    throw new TypeError(`Missing context for module '${module.name}'`)
  }
  return context
}
