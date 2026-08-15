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
import type { EnrichedComponent } from './value-extraction/enriched-component'

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

interface ExtractionProjectInput {
  configuration: ValidatedConfiguration
  moduleSources: ReadonlyMap<ValidatedModule, ModuleSource>
  repositoryName: string
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

type ExtractionProjectParseResult =
  | { success: true; data: ExtractionProject }
  | { success: false; error: string }

export { OrphanedDraftComponentError } from './orphaned-draft-component-error'

/** @riviere-role aggregate */
export class ExtractionProject {
  private constructor(
    private readonly configuration: ValidatedConfiguration,
    private readonly moduleSources: ReadonlyMap<ValidatedModule, ModuleSource>,
    private readonly repositoryName: string,
    private readonly draftComponents: readonly DraftComponent[] = [],
  ) {}

  static parse(input: ExtractionProjectInput): ExtractionProjectParseResult {
    const configuredModules = new Set(input.configuration.modules)
    const missingSources = input.configuration.modules.filter(
      (module) => !input.moduleSources.has(module),
    )
    const foreignSources = [...input.moduleSources.keys()].filter(
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
      data: new ExtractionProject(
        input.configuration,
        input.moduleSources,
        input.repositoryName,
        input.draftComponents,
      ),
    }
  }

  extractDraftComponents(options: {
    allowIncomplete: boolean
    includeConnections: boolean
  }): ExtractionOutcome {
    const draftComponents = this.configuration.modules.flatMap((module) => {
      const source = this.sourceFor(module)
      return extractComponents(source.project, [...source.files], module)
    })

    if (!options.includeConnections) {
      return {
        kind: 'draftOnly',
        components: draftComponents,
      }
    }

    const enrichment = enrichComponentsForModules(
      this.configuration.modules,
      this.moduleContexts,
      groupDraftsByModule(draftComponents, this.configuration.modules, this.moduleSources),
      options.allowIncomplete,
    )
    if (enrichment.kind === 'fieldFailure') {
      return enrichment
    }

    const connectionResult = this.detectConnections(enrichment.components, options.allowIncomplete)
    const httpLinks = this.configuration.connections?.httpLinks ?? []
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
    allowIncomplete: boolean
    includeConnections: boolean
  }): ExtractionOutcome {
    if (!options.includeConnections) {
      return {
        kind: 'draftOnly',
        components: this.draftComponents,
      }
    }

    const enrichment = enrichComponentsForModules(
      this.configuration.modules,
      this.moduleContexts,
      groupDraftsByModule(this.draftComponents, this.configuration.modules, this.moduleSources),
      options.allowIncomplete,
    )
    if (enrichment.kind === 'fieldFailure') {
      return enrichment
    }

    const connectionResult = this.detectConnections(enrichment.components, options.allowIncomplete)
    const httpLinks = this.configuration.connections?.httpLinks ?? []
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
      configuration: this.configuration,
      moduleSources: this.moduleSources,
      repository: this.repositoryName,
      enrichedComponents,
      allowIncomplete,
      httpLinks: this.configuration.connections?.httpLinks ?? [],
    })
  }

  private get moduleContexts() {
    return this.configuration.modules.map((module) => ({
      module,
      project: this.sourceFor(module).project,
    }))
  }

  private sourceFor(module: ValidatedModule): ModuleSource {
    return sourceForModule(this.moduleSources, module)
  }
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
    /* v8 ignore start -- ExtractionProject.parse rejects missing module sources */
    if (source === undefined) {
      throw new TypeError(`Missing source for module '${module.name}'`)
    }
    /* v8 ignore stop */
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
  /* v8 ignore start -- ExtractionProject.parse rejects missing module sources */
  if (source === undefined) {
    throw new TypeError(`Missing source for module '${module.name}'`)
  }
  /* v8 ignore stop */
  return source
}
