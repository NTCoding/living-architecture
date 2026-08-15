import type { EnrichedComponent } from './value-extraction/enriched-component'
import { resolveModuleName } from './component-extraction/extractor'
import {
  CrossModuleConnectionOptions,
  PerModuleConnectionOptions,
} from './connection-detection/connection-detection-values'
import {
  deduplicateCrossStrategy,
  detectCrossModuleConnections,
  detectPerModuleConnections,
} from './connection-detection/detect-connections'
import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { ExtractedLink } from './connection-detection/extracted-link'
import type { ValidatedModule } from '@living-architecture/riviere-extract-config-published-language'
import type { ExtractionStage } from './extraction-stage'

type DetectExtractionConnectionsResult = {
  readonly links: ExtractedLink[]
  readonly externalLinks: ExternalLink[]
}

/** @riviere-role domain-service */
export class DetectExtractionConnections {
  execute(
    stage: ExtractionStage,
    allComponents: readonly EnrichedComponent[],
    options: { readonly allowIncomplete: false },
  ): DetectExtractionConnectionsResult {
    const moduleResults = stage.resolvedConfig.modules.map((module) =>
      detectModuleConnections(stage, module, allComponents, options.allowIncomplete),
    )
    const moduleDetection = combineModuleResults(moduleResults)
    const crossModule = detectCrossModuleConnections(
      allComponents,
      crossModuleOptions(stage, options.allowIncomplete),
    )
    return {
      links: deduplicateCrossStrategy([...moduleDetection.links, ...crossModule.links]),
      externalLinks: moduleDetection.externalLinks,
    }
  }
}

function detectModuleConnections(
  stage: ExtractionStage,
  module: ValidatedModule,
  allComponents: readonly EnrichedComponent[],
  allowIncomplete: boolean,
): DetectExtractionConnectionsResult {
  const context = contextForModule(stage, module)
  const components = allComponents.filter((component) => moduleOwnsComponent(component, module))
  if (components.length === 0) return { links: [], externalLinks: [] }
  const result = detectPerModuleConnections(
    context.project,
    components,
    perModuleOptions(stage, context, allComponents, allowIncomplete),
  )
  return { links: result.links, externalLinks: result.externalLinks }
}

function contextForModule(stage: ExtractionStage, module: ValidatedModule) {
  const context = stage.moduleContexts.find((candidate) => candidate.module === module)
  /* v8 ignore start -- ExtractionStage.parse guarantees one matching context */
  if (context === undefined) throw new TypeError(`Missing context for module '${module.name}'`)
  /* v8 ignore stop */
  return context
}

function moduleOwnsComponent(component: EnrichedComponent, module: ValidatedModule): boolean {
  if (component.domain !== module.domain) return false
  return resolveModuleName(component.location.file, module) === component.module
}

function perModuleOptions(
  stage: ExtractionStage,
  context: ExtractionStage['moduleContexts'][number],
  allComponents: readonly EnrichedComponent[],
  allowIncomplete: boolean,
) {
  return PerModuleConnectionOptions.parse({
    allComponents,
    allowIncomplete,
    repository: stage.repositoryName,
    sourceFilePaths: [...context.files],
    ...(stage.resolvedConfig.connections?.httpLinks === undefined
      ? {}
      : { httpLinks: stage.resolvedConfig.connections.httpLinks }),
  })
}

function crossModuleOptions(stage: ExtractionStage, allowIncomplete: boolean) {
  return CrossModuleConnectionOptions.parse({
    allowIncomplete,
    repository: stage.repositoryName,
    ...(stage.resolvedConfig.connections?.eventPublishers === undefined
      ? {}
      : { eventPublishers: stage.resolvedConfig.connections.eventPublishers }),
  })
}

function combineModuleResults(
  results: readonly DetectExtractionConnectionsResult[],
): DetectExtractionConnectionsResult {
  return {
    links: results.flatMap((result) => result.links),
    externalLinks: results.flatMap((result) => result.externalLinks),
  }
}
