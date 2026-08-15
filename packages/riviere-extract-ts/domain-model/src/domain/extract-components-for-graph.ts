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

type GraphExtractionInput = {
  readonly stage: ExtractionStage
  readonly draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>
  readonly allowIncomplete: boolean
}

/** @riviere-role domain-service */
export class ExtractComponentsForGraph {
  execute(
    stage: ExtractionStage,
    options: { readonly allowIncomplete: boolean },
  ): ExtractComponentsForGraphResult {
    const draftsByModule = extractDraftsByModule(stage)
    return buildGraphExtractionResult({
      stage,
      draftsByModule,
      allowIncomplete: options.allowIncomplete,
    })
  }
}

function buildGraphExtractionResult(input: GraphExtractionInput): ExtractComponentsForGraphResult {
  const { stage } = input
  const repositoryName = stage.repositoryName
  const enrichment = enrichGraphComponents(input)
  return enrichment.kind === 'fieldFailure'
    ? failedGraphExtraction(enrichment.failedFields)
    : successfulGraphExtraction({ repository: repositoryName, enrichment })
}

function enrichGraphComponents(input: GraphExtractionInput): EnrichmentResult {
  const { stage, draftsByModule, allowIncomplete } = input
  const { resolvedConfig, moduleContexts } = stage
  return enrichComponentsForModules(
    resolvedConfig.modules,
    moduleContexts,
    draftsByModule,
    allowIncomplete,
  )
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
  input: SuccessfulGraphExtractionInput,
): ExtractComponentsForGraphResult {
  const { repository, enrichment } = input
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

type EnrichmentInput = {
  readonly results: readonly ModuleEnrichment[]
  readonly allowIncomplete: boolean
}

type EnrichModuleInput = {
  readonly module: ValidatedModule
  readonly moduleContexts: readonly EnrichmentModuleContext[]
  readonly draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>
}

type EnrichExistingModuleInput = {
  readonly moduleDrafts: readonly DraftComponent[]
  readonly module: ValidatedModule
  readonly project: Project
}

type OrphanedDraftModulesInput = {
  readonly drafts: readonly DraftComponent[]
  readonly module: ValidatedModule
}

type ModuleContextInput = {
  readonly contexts: readonly EnrichmentModuleContext[]
  readonly module: ValidatedModule
}

type SuccessfulGraphExtractionInput = {
  readonly repository: string
  readonly enrichment: SuccessfulEnrichment
}

type OrphanedModuleNamesInput = {
  readonly draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>
  readonly knownModuleNames: ReadonlySet<string>
}

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
  return createEnrichmentResult({ results, allowIncomplete })
}

function createEnrichmentResult(input: EnrichmentInput): EnrichmentResult {
  const { results, allowIncomplete } = input
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
  return modules.map((module) => enrichModule({ module, moduleContexts, draftsByModule }))
}

function componentsFromResults(results: readonly ModuleEnrichment[]): EnrichedComponent[] {
  const components: EnrichedComponent[] = []
  for (const result of results) {
    const resultComponents = result.components
    components.push(...resultComponents)
  }
  return components
}

function uniqueFailedFields(results: readonly ModuleEnrichment[]): string[] {
  const fields = new Set<string>()
  for (const result of results) {
    const resultFailedFields = result.failedFields
    for (const field of resultFailedFields) fields.add(field)
  }
  return [...fields]
}

function assertAllDraftsMatchModules(
  draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>,
  modules: readonly ValidatedModule[],
): void {
  const knownModuleNames = new Set(moduleNames(modules))
  const orphanedModules = orphanedModuleNames({ draftsByModule, knownModuleNames })
  if (orphanedModules.length > 0) {
    throw new OrphanedDraftComponentError(orphanedModules, [...knownModuleNames])
  }
}

function moduleNames(modules: readonly ValidatedModule[]): string[] {
  const names: string[] = []
  for (const module of modules) {
    const moduleName = module.name
    names.push(moduleName)
  }
  return names
}

function orphanedModuleNames(input: OrphanedModuleNamesInput): string[] {
  const { draftsByModule, knownModuleNames } = input
  const orphaned: string[] = []
  for (const name of draftsByModule.keys()) {
    const isKnownModule = knownModuleNames.has(name)
    if (!isKnownModule) orphaned.push(name)
  }
  return orphaned
}

interface ModuleEnrichment {
  readonly components: EnrichedComponent[]
  readonly failedFields: string[]
}

function enrichModule(input: EnrichModuleInput): ModuleEnrichment {
  const { module, moduleContexts, draftsByModule } = input
  const context = contextForModule({ contexts: moduleContexts, module })
  const moduleName = module.name
  const moduleDrafts = draftsByModule.get(moduleName) ?? []
  if (moduleDrafts.length === 0) return { components: [], failedFields: [] }
  const project = context.project
  return enrichExistingModule({ moduleDrafts, module, project })
}

function enrichExistingModule(input: EnrichExistingModuleInput): ModuleEnrichment {
  const { moduleDrafts, module, project } = input
  const result = enrichComponents(moduleDrafts, module, project)
  return {
    components: result.components,
    failedFields: failuresFields(result),
  }
}

function failuresFields(result: ReturnType<typeof enrichComponents>): string[] {
  const fields: string[] = []
  const failures = result.failures
  for (const failure of failures) {
    const failureField = failure.field
    fields.push(failureField)
  }
  return fields
}

function extractDraftsByModule(stage: ExtractionStage): Map<string, DraftComponent[]> {
  const grouped = new Map<string, DraftComponent[]>(),
    contexts = stage.moduleContexts
  for (const context of contexts) {
    const module = context.module
    const name = module.name
    grouped.set(name, extractModuleDrafts(context))
  }
  return grouped
}

function extractModuleDrafts(context: ModuleContext): DraftComponent[] {
  const { project, module, files: contextFiles } = context
  const files = [...contextFiles]
  const drafts = extractComponents(project, files, module)
  const orphanedModules = orphanedDraftModules({ drafts, module })
  if (orphanedModules.length > 0) {
    throw new OrphanedDraftComponentError(orphanedModules, [module.domain], 'domains')
  }
  return drafts
}

function orphanedDraftModules(input: OrphanedDraftModulesInput): string[] {
  const { drafts, module } = input
  const orphanedDomains = new Set<string>(),
    moduleDomain = module.domain
  for (const draft of drafts) {
    const { domain: draftDomain } = draft
    if (draftDomain === moduleDomain) continue
    orphanedDomains.add(draftDomain)
  }
  return [...orphanedDomains]
}

function contextForModule(input: ModuleContextInput): EnrichmentModuleContext {
  const { contexts, module } = input,
    moduleName = module.name
  for (const context of contexts) {
    const contextModule = context.module
    const contextModuleName = contextModule.name
    if (contextModuleName === moduleName) return context
  }
  throw new TypeError(`Missing context for module '${moduleName}'`)
}
