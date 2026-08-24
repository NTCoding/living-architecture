import type { ValidatedModule } from '@living-architecture/riviere-extract-config-published-language'
import type { Project } from 'ts-morph'
import type { DraftComponent } from './component-extraction/draft-component'
import { MissingModuleContextError } from './extraction-errors'
import { OrphanedDraftComponentError } from './orphaned-draft-component-error'
import { enrichComponents } from './value-extraction/enrich-components'
import type { EnrichedComponent } from './value-extraction/enriched-component'

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

type ModuleContextInput = {
  readonly contexts: readonly EnrichmentModuleContext[]
  readonly module: ValidatedModule
}

type OrphanedModuleNamesInput = {
  readonly draftsByModule: ReadonlyMap<string, readonly DraftComponent[]>
  readonly knownModuleNames: ReadonlySet<string>
}

type EnrichmentModuleContext = {
  readonly module: ValidatedModule
  readonly project: Project
}

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

function contextForModule(input: ModuleContextInput): EnrichmentModuleContext {
  const { contexts, module } = input,
    moduleName = module.name
  for (const context of contexts) {
    const contextModule = context.module
    const contextModuleName = contextModule.name
    if (contextModuleName === moduleName) return context
  }
  throw new MissingModuleContextError(moduleName)
}
