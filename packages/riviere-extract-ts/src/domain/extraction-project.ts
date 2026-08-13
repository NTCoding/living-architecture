import type { Project } from 'ts-morph'
import type {
  ValidatedConfiguration,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config'
import type { ExternalLink } from '@living-architecture/riviere-schema/schema'
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
import { enrichComponents } from './value-extraction/enrich-components'
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

/** @riviere-role domain-error */
export class OrphanedDraftComponentError extends Error {
  constructor(orphanedModules: string[], knownModules: string[]) {
    super(
      `Draft components reference unknown modules: [${orphanedModules.join(', ')}]. Known modules: [${knownModules.join(', ')}]`,
    )
    this.name = 'OrphanedDraftComponentError'
  }
}

interface FieldFailureEnrichment {
  kind: 'fieldFailure'
  failedFields: string[]
}

interface SuccessfulEnrichment {
  kind: 'enriched'
  components: EnrichedComponent[]
  failedFields: string[]
}

type EnrichmentResult = FieldFailureEnrichment | SuccessfulEnrichment

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

    const enrichment = this.enrichDraftComponentValues(draftComponents, options.allowIncomplete)
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

    const enrichment = this.enrichDraftComponentValues(
      this.draftComponents,
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

  get moduleContextProjectNames(): string[] {
    return this.configuration.modules.map((module) => module.name)
  }

  public detectConnections(
    enrichedComponents: EnrichedComponent[],
    allowIncomplete: boolean,
  ): {
    links: ExtractedLink[]
    externalLinks: ExternalLink[]
    timings: ConnectionTimings[]
  } {
    const links: ExtractedLink[] = []
    const externalLinks: ExternalLink[] = []
    const timings: ConnectionTimings[] = []
    const httpLinks = this.configuration.connections?.httpLinks ?? []

    for (const module of this.configuration.modules) {
      const source = this.sourceFor(module)
      const moduleComponents = enrichedComponents.filter(
        (component) => component.module === module.name,
      )
      if (moduleComponents.length === 0) {
        continue
      }

      const result = detectPerModuleConnections(
        source.project,
        moduleComponents,
        PerModuleConnectionOptions.parse({
          allComponents: enrichedComponents,
          allowIncomplete,
          httpLinks,
          repository: this.repositoryName,
          sourceFilePaths: [...source.files],
        }),
      )
      links.push(...result.links)
      externalLinks.push(...result.externalLinks)
      timings.push(
        ConnectionTimings.parse({
          callGraphMs: result.timings.callGraphMs,
          asyncDetectionMs: 0,
          setupMs: result.timings.setupMs,
          totalMs: result.timings.callGraphMs + result.timings.setupMs,
        }),
      )
    }

    const eventPublishers = this.configuration.connections?.eventPublishers
    const crossResult = detectCrossModuleConnections(
      enrichedComponents,
      CrossModuleConnectionOptions.parse({
        allowIncomplete,
        repository: this.repositoryName,
        ...(eventPublishers === undefined ? {} : { eventPublishers }),
      }),
    )
    links.push(...crossResult.links)
    timings.push(
      ConnectionTimings.parse({
        callGraphMs: 0,
        asyncDetectionMs: crossResult.timings.asyncDetectionMs,
        setupMs: 0,
        totalMs: crossResult.timings.asyncDetectionMs,
      }),
    )

    return {
      links: deduplicateCrossStrategy(links),
      externalLinks,
      timings,
    }
  }

  private enrichDraftComponentValues(
    draftComponents: readonly DraftComponent[],
    allowIncomplete: boolean,
  ): EnrichmentResult {
    const moduleNames = new Set(this.moduleContextProjectNames)
    const draftsByModule = groupDraftsByModule(draftComponents)
    assertAllDraftsMatchModules(draftsByModule, moduleNames)
    const components: EnrichedComponent[] = []
    const failedFieldSet = new Set<string>()

    for (const module of this.configuration.modules) {
      const moduleDrafts = draftsByModule.get(module.name) ?? []
      if (moduleDrafts.length === 0) {
        continue
      }

      const result = enrichComponents(moduleDrafts, module, this.sourceFor(module).project)
      components.push(...result.components)
      for (const failure of result.failures) {
        failedFieldSet.add(failure.field)
      }
    }

    const failedFields = [...failedFieldSet]
    if (failedFields.length > 0 && !allowIncomplete) {
      return {
        kind: 'fieldFailure',
        failedFields,
      }
    }

    return {
      kind: 'enriched',
      components,
      failedFields,
    }
  }

  private sourceFor(module: ValidatedModule): ModuleSource {
    const source = this.moduleSources.get(module)
    /* v8 ignore start -- parse rejects missing module sources */
    if (source === undefined) throw new TypeError(`Missing source for module '${module.name}'`)
    /* v8 ignore stop */
    return source
  }
}

function assertAllDraftsMatchModules(
  draftsByModule: Map<string, DraftComponent[]>,
  moduleNames: Set<string>,
): void {
  const orphanedModules = [...draftsByModule.keys()].filter((name) => !moduleNames.has(name))
  if (orphanedModules.length > 0) {
    throw new OrphanedDraftComponentError(orphanedModules, [...moduleNames])
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
