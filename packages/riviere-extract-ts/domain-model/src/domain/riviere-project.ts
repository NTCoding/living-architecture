import type { Project } from 'ts-morph'
import type {
  HttpLinkConfig,
  ValidatedConfiguration,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { DraftComponent } from './component-extraction/draft-component'
import { extractComponents, resolveModuleName } from './component-extraction/extractor'
import { ConnectionTimings } from './connection-detection/connection-detection-values'
import { detectConfiguredConnections } from './connection-detection/detect-configured-connections'
import type { ExtractedLink } from './connection-detection/extracted-link'
import { stripResolvedCustomTypes } from './connection-detection/resolve-http-links'
import { OrphanedDraftComponentError } from './orphaned-draft-component-error'
import { enrichComponentsForModules } from './extract-components-for-graph'
import { MissingModuleSourceError } from './extraction-errors'
import type { EnrichedComponent } from './value-extraction/enriched-component'
import type { ExtractionStage } from './extraction-stage'

interface DraftOnlyOutcome {
  kind: 'draftOnly'
  components: readonly DraftComponent[]
}

interface FullExtractionOutcome {
  kind: 'full'
  components: EnrichedComponent[]
  failedFields: string[]
  links: ExtractedLink[]
  externalLinks: ExternalLink[]
  timings: ConnectionTimings[]
}

interface FieldFailureOutcome {
  kind: 'fieldFailure'
  failedFields: string[]
}

type ExtractionOutcome = DraftOnlyOutcome | FullExtractionOutcome | FieldFailureOutcome

interface ModuleSource {
  files: readonly string[]
  project: Project
}

interface RiviereProjectInput {
  stage: ExtractionStage
  draftComponents?: readonly DraftComponent[]
}

interface ComponentOwnershipInput {
  readonly component: {
    readonly domain: string
    readonly location?: { readonly file: string }
    readonly module: string
  }
  readonly module: ValidatedModule
  readonly files: readonly string[]
}

type RiviereProjectParseResult =
  | { success: true; data: RiviereProject }
  | { success: false; error: string }

export { OrphanedDraftComponentError } from './orphaned-draft-component-error'

/** @riviere-role aggregate */
export class RiviereProject {
  readonly stage: ExtractionStage

  private constructor(
    stage: ExtractionStage,
    private readonly moduleSources: ReadonlyMap<ValidatedModule, ModuleSource>,
    private readonly initialDraftComponents: readonly DraftComponent[] = [],
  ) {
    this.stage = stage
  }

  static parse(input: RiviereProjectInput): RiviereProjectParseResult {
    const configuredModules = new Set(input.stage.resolvedConfig.modules)
    const moduleSources = new Map(
      input.stage.moduleContexts.map((context) => [context.module, context] as const),
    )
    const missingSources = input.stage.resolvedConfig.modules.filter(
      (module) => !moduleSources.has(module),
    )
    const foreignSources = [...moduleSources.keys()].filter(
      (module) => !configuredModules.has(module),
    )
    if (missingSources.length > 0 || foreignSources.length > 0) {
      return {
        success: false,
        error: [
          ...missingSources.map((module) => `Missing source for module '${module.name}'`),
          ...foreignSources.map((module) => `Source supplied for unknown module '${module.name}'`),
        ].join('\n'),
      }
    }

    return {
      success: true,
      data: new RiviereProject(input.stage, moduleSources, input.draftComponents),
    }
  }

  extractDraftComponents(options: {
    sourceFileSelection?: SourceFileSelection
    allowIncomplete: boolean
    includeConnections: boolean
  }): ExtractionOutcome {
    const sourceFileSelection = options.sourceFileSelection ?? { kind: 'all' as const }
    const selectedModuleSources = this.selectedModuleSources(sourceFileSelection)
    const draftComponents = this.stage.resolvedConfig.modules.flatMap((module) => {
      const source = this.sourceFor(module)
      const selectedFiles =
        sourceFileSelection.kind === 'all'
          ? source.files
          : source.files.filter((file) => sourceFileSelection.filePaths.includes(file))
      return extractComponents(source.project, [...selectedFiles], module)
    })

    if (!options.includeConnections) {
      return {
        kind: 'draftOnly',
        components: draftComponents,
      }
    }

    const enrichment = enrichComponentsForModules(
      this.stage.resolvedConfig.modules,
      this.moduleContexts,
      groupDraftsByModule(
        draftComponents,
        this.stage.resolvedConfig.modules,
        selectedModuleSources,
      ),
      options.allowIncomplete,
    )
    if (enrichment.kind === 'fieldFailure') {
      return enrichment
    }

    const connectionResult = this.detectConnections(enrichment.components, options.allowIncomplete)
    const httpLinks = this.stage.resolvedConfig.connections?.httpLinks ?? []
    const visibleComponents = stripResolvedCustomTypes(
      enrichment.components,
      httpLinks,
      connectionResult.links,
    )

    return {
      kind: 'full',
      components: visibleComponents,
      failedFields: enrichment.failedFields,
      links: connectionResult.links,
      externalLinks: connectionResult.externalLinks,
      timings: connectionResult.timings,
    }
  }

  enrichDraftComponents(options: {
    draftComponents?: readonly DraftComponent[]
    allowIncomplete: boolean
    includeConnections: boolean
  }): ExtractionOutcome {
    const draftComponents = options.draftComponents ?? this.initialDraftComponents
    if (!options.includeConnections) {
      return {
        kind: 'draftOnly',
        components: draftComponents,
      }
    }

    const enrichment = enrichComponentsForModules(
      this.stage.resolvedConfig.modules,
      this.moduleContexts,
      groupDraftsByModule(draftComponents, this.stage.resolvedConfig.modules, this.moduleSources),
      options.allowIncomplete,
    )
    if (enrichment.kind === 'fieldFailure') {
      return enrichment
    }

    const connectionResult = this.detectConnections(enrichment.components, options.allowIncomplete)
    const httpLinks = this.stage.resolvedConfig.connections?.httpLinks ?? []
    const visibleComponents = stripResolvedCustomTypes(
      enrichment.components,
      httpLinks,
      connectionResult.links,
    )

    return {
      kind: 'full',
      components: visibleComponents,
      failedFields: enrichment.failedFields,
      links: connectionResult.links,
      externalLinks: connectionResult.externalLinks,
      timings: connectionResult.timings,
    }
  }

  public detectConnections(
    enrichedComponents: EnrichedComponent[],
    allowIncomplete: boolean,
  ): {
    links: ExtractedLink[]
    externalLinks: ExternalLink[]
    timings: ConnectionTimings[]
  } {
    return detectProjectConnections({
      configuration: this.stage.resolvedConfig,
      moduleSources: this.moduleSources,
      repository: this.stage.repositoryName,
      enrichedComponents,
      allowIncomplete,
      httpLinks: this.stage.resolvedConfig.connections?.httpLinks ?? [],
    })
  }

  private get moduleContexts() {
    return this.stage.moduleContexts.map(({ module, project }) => ({ module, project }))
  }

  private sourceFor(module: ValidatedModule): ModuleSource {
    return sourceForModule(this.moduleSources, module)
  }

  private selectedModuleSources(selection: SourceFileSelection) {
    if (selection.kind === 'all') return this.moduleSources
    const selectedFiles = new Set(selection.filePaths)
    return new Map(
      [...this.moduleSources.entries()].map(
        ([module, source]) =>
          [
            module,
            { ...source, files: source.files.filter((file) => selectedFiles.has(file)) },
          ] as const,
      ),
    )
  }
}

type SourceFileSelection =
  | { readonly kind: 'all' }
  | { readonly kind: 'files'; readonly filePaths: readonly string[] }

function moduleOwnsComponent(input: ComponentOwnershipInput): boolean {
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

export { moduleOwnsComponent }

interface ProjectConnectionDetectionInput {
  readonly configuration: ValidatedConfiguration
  readonly moduleSources: ReadonlyMap<ValidatedModule, ModuleSource>
  readonly repository: string
  readonly enrichedComponents: EnrichedComponent[]
  readonly allowIncomplete: boolean
  readonly httpLinks: HttpLinkConfig[]
}

function detectProjectConnections(input: ProjectConnectionDetectionInput): {
  links: ExtractedLink[]
  externalLinks: ExternalLink[]
  timings: ConnectionTimings[]
} {
  const sources = input.configuration.modules.map((module) => configuredSource(module, input))
  const result = detectConfiguredConnections({
    sources,
    allComponents: input.enrichedComponents,
    options: {
      allowIncomplete: input.allowIncomplete,
      repository: input.repository,
      ...(input.configuration.connections?.eventPublishers === undefined
        ? {}
        : { eventPublishers: input.configuration.connections.eventPublishers }),
      ...(input.httpLinks.length === 0 ? {} : { httpLinks: input.httpLinks }),
    },
  })
  return {
    links: result.links,
    externalLinks: result.externalLinks,
    timings: [summarizeConnectionTimings(result.timings)],
  }
}

function configuredSource(
  module: ValidatedModule,
  input: ProjectConnectionDetectionInput,
): {
  files: readonly string[]
  project: Project
  components: readonly EnrichedComponent[]
} {
  const source = sourceForModule(input.moduleSources, module)
  return {
    files: source.files,
    project: source.project,
    components: input.enrichedComponents.filter((component) =>
      moduleOwnsComponent({ component, module, files: source.files }),
    ),
  }
}

function summarizeConnectionTimings(timings: readonly ConnectionTimings[]): ConnectionTimings {
  return ConnectionTimings.parse({
    callGraphMs: timings.reduce((total, timing) => total + timing.callGraphMs, 0),
    asyncDetectionMs: timings.reduce((total, timing) => total + timing.asyncDetectionMs, 0),
    setupMs: timings.reduce((total, timing) => total + timing.setupMs, 0),
    totalMs: timings.reduce((total, timing) => total + timing.totalMs, 0),
  })
}

function groupDraftsByModule(
  drafts: readonly DraftComponent[],
  modules: readonly ValidatedModule[],
  moduleSources: ReadonlyMap<ValidatedModule, ModuleSource>,
): Map<string, DraftComponent[]> {
  const grouped = new Map<string, DraftComponent[]>()
  for (const module of modules) {
    const source = moduleSources.get(module)
    if (source === undefined) {
      throw new MissingModuleSourceError(module.name)
    }
    const moduleDrafts = drafts.filter((draft) =>
      moduleOwnsComponent({ component: draft, module, files: source.files }),
    )
    if (moduleDrafts.length > 0) grouped.set(module.name, moduleDrafts)
  }

  const matchedDrafts = new Set([...grouped.values()].flat())
  const unmatchedDrafts = drafts.filter((draft) => !matchedDrafts.has(draft))
  if (unmatchedDrafts.length > 0) {
    throw new OrphanedDraftComponentError(
      [...new Set(unmatchedDrafts.map((draft) => draft.domain))],
      modules.map((module) => module.domain),
      'domains',
    )
  }

  return grouped
}

function sourceForModule(
  moduleSources: ReadonlyMap<ValidatedModule, ModuleSource>,
  module: ValidatedModule,
): ModuleSource {
  const source = moduleSources.get(module)
  if (source === undefined) {
    throw new MissingModuleSourceError(module.name)
  }
  return source
}
