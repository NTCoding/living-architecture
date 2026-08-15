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
  const modules = stage.resolvedConfig.modules
  const contexts = stage.moduleContexts
  const repository = stage.repositoryName
  const enrichment = enrichComponentsForModules(modules, contexts, draftsByModule, allowIncomplete)
  return enrichment.kind === 'fieldFailure'
    ? failedGraphExtraction(enrichment.failedFields)
    : successfulGraphExtraction(repository, enrichment)
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
  const { components, failedFields } = enrichment
  return {
    ok: true,
    repository,
    components,
    failedFields,
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
  const results = enrichModules(modules, moduleContexts, draftsByModule)
  const components = componentsFromResults(results)
  const failedFields = uniqueFailedFields(results)
  if (failedFields.length > 0 && !allowIncomplete) {
    return { kind: 'fieldFailure', failedFields }
  }

  return { kind: 'enriched', components, failedFields }
}

function enrichModules(
  modules: readonly ValidatedModule[],
  moduleContexts: readonly EnrichmentModuleContext[],
  draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>,
): ModuleEnrichment[] {
  return modules.map((module) => enrichModule(module, moduleContexts, draftsByModule))
}

function componentsFromResults(results: readonly ModuleEnrichment[]): EnrichedComponent[] {
  return results.flatMap(resultComponents)
}

function resultComponents(result: ModuleEnrichment): EnrichedComponent[] {
  return result.components
}

function uniqueFailedFields(results: readonly ModuleEnrichment[]): string[] {
  const fields = results.flatMap(resultFailedFields)
  return [...new Set(fields)]
}

function resultFailedFields(result: ModuleEnrichment): string[] {
  return result.failedFields
}

function assertAllDraftsMatchModules(
  draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>,
  modules: readonly ValidatedModule[],
): void {
  const knownModuleNames = new Set(moduleNames(modules))
  const orphanedModules = orphanedModuleNames(draftsByModule, knownModuleNames)
  if (orphanedModules.length > 0) {
    throw new OrphanedDraftComponentError(orphanedModules, [...knownModuleNames])
  }
}

function moduleNames(modules: readonly ValidatedModule[]): string[] {
  return modules.map(moduleName)
}

function moduleName(module: ValidatedModule): string {
  return module.name
}

function orphanedModuleNames(
  draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>,
  knownModuleNames: ReadonlySet<string>,
): string[] {
  const moduleNames = [...draftsByModule.keys()]
  return moduleNames.filter((name) => !knownModuleNames.has(name))
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
  return moduleDrafts.length === 0
    ? { components: [], failedFields: [] }
    : enrichExistingModule(moduleDrafts, module, context.project)
}

function enrichExistingModule(
  moduleDrafts: readonly DraftComponent[],
  module: ValidatedModule,
  project: Project,
): ModuleEnrichment {
  const result = enrichComponents(moduleDrafts, module, project)
  return {
    components: result.components,
    failedFields: failuresFields(result),
  }
}

function failuresFields(result: ReturnType<typeof enrichComponents>): string[] {
  const failures = result.failures
  return failures.map((failure) => failure.field)
}

function extractDraftsByModule(stage: ExtractionStage): Map<string, DraftComponent[]> {
  const grouped = new Map<string, DraftComponent[]>()
  const contexts = stage.moduleContexts
  for (const context of contexts) {
    const module = context.module
    const name = module.name
    grouped.set(name, extractModuleDrafts(context))
  }
  return grouped
}

function extractModuleDrafts(context: ModuleContext): DraftComponent[] {
  const project = context.project
  const files = [...context.files]
  const module = context.module
  const drafts = extractComponents(project, files, module)
  const orphanedModules = orphanedDraftModules(drafts, module)
  if (orphanedModules.length > 0) {
    throw new OrphanedDraftComponentError(orphanedModules, [context.module.name])
  }
  return drafts
}

function orphanedDraftModules(
  drafts: readonly DraftComponent[],
  module: ValidatedModule,
): string[] {
  const foreignDrafts = drafts.filter((draft) => isForeignDraft(draft, module))
  return foreignDrafts.map(draftModule)
}

function isForeignDraft(draft: DraftComponent, module: ValidatedModule): boolean {
  return draft.domain !== module.domain
}

function draftModule(draft: DraftComponent): string {
  return draft.module
}

function contextForModule(
  contexts: readonly EnrichmentModuleContext[],
  module: ValidatedModule,
): EnrichmentModuleContext {
  const context = contexts.find((candidate) => contextMatches(candidate, module))
  if (context === undefined) {
    throw new TypeError(`Missing context for module '${module.name}'`)
  }
  return context
}

function contextMatches(context: EnrichmentModuleContext, module: ValidatedModule): boolean {
  const contextModule = context.module
  return contextModule.name === module.name
}
