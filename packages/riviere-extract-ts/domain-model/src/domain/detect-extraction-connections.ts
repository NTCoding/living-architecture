import type { EnrichedComponent } from './value-extraction/enriched-component'
import type { ValidatedModule } from '@living-architecture/riviere-extract-config-published-language'
import { resolveModuleName } from './component-extraction/extractor'
import { detectConfiguredConnections } from './connection-detection/detect-configured-connections'
import type { ExtractionStage } from './extraction-stage'

type ConfiguredSourceInput = {
  readonly stage: ExtractionStage
  readonly module: ValidatedModule
  readonly allComponents: readonly EnrichedComponent[]
}

type ConnectionOptionsInput = {
  readonly stage: ExtractionStage
  readonly allowIncomplete: boolean
}

type OptionalConnectionSettings = ExtractionStage['resolvedConfig']['connections']

interface ComponentOwnershipInput {
  readonly component: {
    readonly domain: string
    readonly location?: { readonly file: string }
    readonly module: string
  }
  readonly module: ValidatedModule
  readonly files: readonly string[]
}

type ConfiguredSource = {
  readonly files: readonly string[]
  readonly project: ExtractionStage['moduleContexts'][number]['project']
  readonly components: readonly EnrichedComponent[]
}

type ConfiguredSourcesInput = {
  readonly stage: ExtractionStage
  readonly allComponents: readonly EnrichedComponent[]
}

/** @riviere-role domain-service */
export class DetectExtractionConnections {
  execute(
    stage: ExtractionStage,
    allComponents: readonly EnrichedComponent[],
    options: { readonly allowIncomplete: boolean },
  ) {
    const sources = configuredSources({ stage, allComponents })
    const connectionConfig = connectionOptions({
      stage,
      allowIncomplete: options.allowIncomplete,
    })
    return detectConfiguredConnections({
      sources,
      allComponents,
      options: connectionConfig,
    })
  }
}

function configuredSources(input: ConfiguredSourcesInput): ConfiguredSource[] {
  const { stage, allComponents } = input
  const { resolvedConfig } = stage
  const modules = resolvedConfig.modules
  return modules.map((module) => configuredSource({ stage, module, allComponents }))
}

function configuredSource(input: ConfiguredSourceInput) {
  const { stage, module, allComponents } = input
  const context = contextForModule(stage, module)
  const { files, project } = context
  const components = componentsForModule(allComponents, module, files)
  return {
    files,
    project,
    components,
  }
}

function componentsForModule(
  allComponents: readonly EnrichedComponent[],
  module: ValidatedModule,
  files: readonly string[],
): readonly EnrichedComponent[] {
  return allComponents.filter((component) => moduleOwnsComponent({ component, module, files }))
}

function contextForModule(stage: ExtractionStage, module: ValidatedModule) {
  const contexts = stage.moduleContexts
  for (const context of contexts) {
    if (context.module === module) return context
  }
  throw new TypeError(`Missing context for module '${module.name}'`)
}

/** @riviere-role domain-service */
export function moduleOwnsComponent(input: ComponentOwnershipInput): boolean {
  const { component, module, files } = input
  const { location, domain, module: componentModule } = component
  const { domain: moduleDomain } = module
  if (location === undefined) {
    return domain === moduleDomain && componentModule === module.name
  }
  const { file } = location
  const isConfiguredFile = files.length === 0 || files.includes(file)
  if (!isConfiguredFile || domain !== moduleDomain) return false
  const resolvedModule = files.length === 0 ? module.name : resolveModuleName(file, module)
  return resolvedModule === componentModule
}

function connectionOptions(input: ConnectionOptionsInput) {
  const { stage, allowIncomplete } = input
  const { resolvedConfig, repositoryName } = stage
  return {
    allowIncomplete,
    repository: repositoryName,
    ...optionalConnectionOptions(resolvedConfig.connections),
  }
}

function optionalConnectionOptions(connections: OptionalConnectionSettings) {
  const eventPublishers = connections?.eventPublishers
  const httpLinks = connections?.httpLinks
  return {
    ...(eventPublishers === undefined ? {} : { eventPublishers }),
    ...(httpLinks === undefined ? {} : { httpLinks }),
  }
}
