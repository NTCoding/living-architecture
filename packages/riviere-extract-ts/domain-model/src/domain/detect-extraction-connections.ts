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
    return detectConfiguredConnections(
      configuredSources(stage, allComponents),
      allComponents,
      connectionOptions(stage, options.allowIncomplete),
    )
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
  return stage.resolvedConfig.modules.map((module) =>
    configuredSource(stage, module, allComponents),
  )
}

function configuredSource(
  stage: ExtractionStage,
  module: ValidatedModule,
  allComponents: readonly EnrichedComponent[],
) {
  const context = contextForModule(stage, module)
  return {
    files: context.files,
    project: context.project,
    components: allComponents.filter((component) =>
      moduleOwnsComponent(component, module, context.files),
    ),
  }
}

function contextForModule(stage: ExtractionStage, module: ValidatedModule) {
  const context = stage.moduleContexts.find((candidate) => candidate.module === module)
  if (context === undefined) throw new TypeError(`Missing context for module '${module.name}'`)
  return context
}

function moduleOwnsComponent(
  component: EnrichedComponent,
  module: ValidatedModule,
  files: readonly string[],
): boolean {
  if (!files.includes(component.location.file)) return false
  if (component.domain !== module.domain) return false
  return resolveModuleName(component.location.file, module) === component.module
}

function connectionOptions(stage: ExtractionStage, allowIncomplete: boolean) {
  const connections = stage.resolvedConfig.connections
  return {
    allowIncomplete,
    repository: stage.repositoryName,
    ...(connections?.eventPublishers === undefined
      ? {}
      : { eventPublishers: connections.eventPublishers }),
    ...(connections?.httpLinks === undefined ? {} : { httpLinks: connections.httpLinks }),
  }
}
