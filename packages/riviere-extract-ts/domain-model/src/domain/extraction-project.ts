import type { Project } from 'ts-morph'
import type {
  HttpLinkConfig,
  ValidatedConfiguration,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { DraftComponent } from './component-extraction/draft-component'
import { extractComponents } from './component-extraction/extractor'
import {
  ConnectionTimings,
  CrossModuleConnectionOptions,
  PerModuleConnectionOptions,
} from './connection-detection/connection-detection-values'
import {
  deduplicateCrossStrategy,
  detectCrossModuleConnections,
  detectPerModuleConnections,
} from './connection-detection/detect-connections'
import type { ExtractedLink } from './connection-detection/extracted-link'
import { stripResolvedCustomTypes } from './connection-detection/resolve-http-links'
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
      groupDraftsByModule(draftComponents),
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
      groupDraftsByModule(this.draftComponents),
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
    const source = this.moduleSources.get(module)
    /* v8 ignore start -- parse rejects missing module sources */
    if (source === undefined) throw new TypeError(`Missing source for module '${module.name}'`)
    /* v8 ignore stop */
    return source
  }
}

interface ProjectModuleConnectionResult {
  readonly links: ExtractedLink[]
  readonly externalLinks: ExternalLink[]
  readonly timing: ConnectionTimings
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
  const moduleResults = input.configuration.modules.flatMap((module) =>
    projectModuleResult(module, input),
  )
  const crossModule = detectProjectCrossModuleConnections(input)
  return combineProjectConnectionResults(moduleResults, crossModule)
}

function projectModuleResult(
  module: ValidatedModule,
  input: ProjectConnectionDetectionInput,
): ProjectModuleConnectionResult[] {
  const result = detectProjectModuleConnections(module, input)
  return result === undefined ? [] : [result]
}

function detectProjectModuleConnections(
  module: ValidatedModule,
  input: ProjectConnectionDetectionInput,
): ProjectModuleConnectionResult | undefined {
  const source = input.moduleSources.get(module)
  /* v8 ignore start -- ExtractionProject.parse rejects missing module sources */
  if (source === undefined) {
    throw new TypeError(`Missing source for module '${module.name}'`)
  }
  /* v8 ignore stop */
  const moduleComponents = input.enrichedComponents.filter(
    (component) => component.module === module.name,
  )
  if (moduleComponents.length === 0) return undefined

  return detectProjectModuleResult(source, moduleComponents, input)
}

function detectProjectModuleResult(
  source: ModuleSource,
  moduleComponents: EnrichedComponent[],
  input: ProjectConnectionDetectionInput,
): ProjectModuleConnectionResult {
  const result = detectPerModuleConnections(
    source.project,
    moduleComponents,
    PerModuleConnectionOptions.parse({
      allComponents: input.enrichedComponents,
      allowIncomplete: input.allowIncomplete,
      httpLinks: input.httpLinks,
      repository: input.repository,
      sourceFilePaths: [...source.files],
    }),
  )
  return projectModuleConnectionResult(result)
}

function detectProjectCrossModuleConnections(
  input: ProjectConnectionDetectionInput,
): ProjectModuleConnectionResult {
  const result = detectCrossModuleConnections(input.enrichedComponents, crossModuleOptions(input))
  return {
    links: result.links,
    externalLinks: [],
    timing: ConnectionTimings.parse({
      callGraphMs: 0,
      asyncDetectionMs: result.timings.asyncDetectionMs,
      setupMs: 0,
      totalMs: result.timings.asyncDetectionMs,
    }),
  }
}

function crossModuleOptions(input: ProjectConnectionDetectionInput) {
  const eventPublishers = input.configuration.connections?.eventPublishers
  return CrossModuleConnectionOptions.parse({
    allowIncomplete: input.allowIncomplete,
    repository: input.repository,
    ...(eventPublishers === undefined ? {} : { eventPublishers }),
  })
}

function projectModuleConnectionResult(
  result: ReturnType<typeof detectPerModuleConnections>,
): ProjectModuleConnectionResult {
  return {
    links: result.links,
    externalLinks: result.externalLinks,
    timing: ConnectionTimings.parse({
      callGraphMs: result.timings.callGraphMs,
      asyncDetectionMs: 0,
      setupMs: result.timings.setupMs,
      totalMs: result.timings.callGraphMs + result.timings.setupMs,
    }),
  }
}

function combineProjectConnectionResults(
  moduleResults: readonly ProjectModuleConnectionResult[],
  crossModule: ProjectModuleConnectionResult,
): {
  links: ExtractedLink[]
  externalLinks: ExternalLink[]
  timings: ConnectionTimings[]
} {
  const results = [...moduleResults, crossModule]
  return {
    links: deduplicateCrossStrategy(results.flatMap((result) => result.links)),
    externalLinks: results.flatMap((result) => result.externalLinks),
    timings: results.map((result) => result.timing),
  }
}

function groupDraftsByModule(drafts: readonly DraftComponent[]): Map<string, DraftComponent[]> {
  const grouped = new Map<string, DraftComponent[]>()
  for (const draft of drafts) {
    const existing = grouped.get(draft.module)
    if (existing !== undefined) {
      existing.push(draft)
      continue
    }

    grouped.set(draft.module, [draft])
  }

  return grouped
}
