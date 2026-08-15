import type { EnrichedComponent } from './value-extraction/enriched-component'
import type { ValidatedModule } from '@living-architecture/riviere-extract-config-published-language'
import { resolveModuleName } from './component-extraction/extractor'
import { detectConfiguredConnections } from './connection-detection/detect-configured-connections'
import type { ExtractionStage } from './extraction-stage'

/** @riviere-role domain-service */
export class DetectExtractionConnections {
  execute(
    stage: ExtractionStage,
    allComponents: readonly EnrichedComponent[],
    options: { readonly allowIncomplete: false },
  ) {
    const sources = configuredSources(stage, allComponents)
    const connectionConfig = connectionOptions(stage, options.allowIncomplete)
    return detectConfiguredConnections(sources, allComponents, connectionConfig)
  }
}

function configuredSources(
  stage: ExtractionStage,
  allComponents: readonly EnrichedComponent[],
): {
  files: readonly string[]
  project: ExtractionStage['moduleContexts'][number]['project']
  components: readonly EnrichedComponent[]
}[] {
  const modules = stage.resolvedConfig.modules
  return modules.map((module) => configuredSource(stage, module, allComponents))
}

function configuredSource(
  stage: ExtractionStage,
  module: ValidatedModule,
  allComponents: readonly EnrichedComponent[],
) {
  const context = contextForModule(stage, module)
  const components = componentsForModule(allComponents, module, context.files)
  return {
    files: context.files,
    project: context.project,
    components,
  }
}

function componentsForModule(
  allComponents: readonly EnrichedComponent[],
  module: ValidatedModule,
  files: readonly string[],
): readonly EnrichedComponent[] {
  return allComponents.filter((component) => moduleOwnsComponent(component, module, files))
}

function contextForModule(stage: ExtractionStage, module: ValidatedModule) {
  const contexts = stage.moduleContexts
  const context = contexts.find((candidate) => candidate.module === module)
  if (context === undefined) throw new TypeError(`Missing context for module '${module.name}'`)
  return context
}

function moduleOwnsComponent(
  component: EnrichedComponent,
  module: ValidatedModule,
  files: readonly string[],
): boolean {
  const location = component.location
  const file = location.file
  if (!files.includes(file)) return false
  if (component.domain !== module.domain) return false
  const resolvedModule = resolveModuleName(file, module)
  return resolvedModule === component.module
}

function connectionOptions(stage: ExtractionStage, allowIncomplete: boolean) {
  const connections = stage.resolvedConfig.connections
  const eventPublishers = connections?.eventPublishers
  const httpLinks = connections?.httpLinks
  return {
    allowIncomplete,
    repository: stage.repositoryName,
    ...(eventPublishers === undefined ? {} : { eventPublishers }),
    ...(httpLinks === undefined ? {} : { httpLinks }),
  }
}
