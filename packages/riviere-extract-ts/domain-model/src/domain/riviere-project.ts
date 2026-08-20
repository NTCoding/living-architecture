import type { Project } from 'ts-morph'
import type {
  HttpLinkConfig,
  ValidatedConfiguration,
  ValidatedModule,
} from '@living-architecture/riviere-extract-config-published-language'
import type { ExternalLink, RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import { DraftComponent } from './component-extraction/draft-component'
import { extractComponents } from './component-extraction/extractor'
import { ConnectionTimings } from './connection-detection/connection-detection-values'
import { detectConfiguredConnections } from './connection-detection/detect-configured-connections'
import type { ExtractedLink } from './connection-detection/extracted-link'
import { stripResolvedCustomTypes } from './connection-detection/resolve-http-links'
import { ExtractComponentsForGraph, enrichComponentsForModules } from './extract-components-for-graph'
import { MissingModuleSourceError } from './extraction-errors'
import { groupDraftsByModule } from './group-drafts-by-module'
import type { EnrichedComponent } from './value-extraction/enriched-component'
import type { ExtractionStage } from './extraction-stage'
import type { LoadDraftComponents } from './ports/load-draft-components'
import type { GraphBuilder } from './ports/graph-builder'
import { DetectExtractionConnections } from './detect-extraction-connections'
import { moduleOwnsComponent } from './module-owns-component'
import { WorkflowStage, WorkflowState } from './workflow-state'

interface DraftOnlyOutcome { kind: 'draftOnly'; components: readonly DraftComponent[] }
interface FullExtractionOutcome {
  kind: 'full'
  components: EnrichedComponent[]
  failedFields: string[]
  links: ExtractedLink[]
  externalLinks: ExternalLink[]
  timings: ConnectionTimings[]
}

interface FieldFailureOutcome { kind: 'fieldFailure'; failedFields: string[] }
interface DraftComponentsFailureOutcome { kind: 'draftComponentsFailure'; message: string }

type ExtractionOutcome =
  | DraftOnlyOutcome
  | FullExtractionOutcome
  | FieldFailureOutcome
  | DraftComponentsFailureOutcome

interface ModuleSource {
  files: readonly string[]
  project: Project
}

interface RiviereProjectInput {
  stage: ExtractionStage
}

interface WorkflowProjectInput {
  readonly graph: Parameters<typeof WorkflowState.parse>[0]['graph']
  readonly runLogDirectory: string
  readonly stages: readonly WorkflowStage[]
}

type RiviereProjectParseResult =
  | { success: true; data: RiviereProject }
  | { success: false; error: string }

type RebuildGraphResult =
  | { readonly ok: true; readonly graph: RiviereGraph }
  | { readonly ok: false; readonly failure: { readonly reason: string; readonly failedFields: string[] } }

export { OrphanedDraftComponentError } from './orphaned-draft-component-error'

/** @riviere-role aggregate */
export class RiviereProject {
  readonly stage: ExtractionStage
  readonly workflowState: WorkflowState | undefined

  private constructor(
    stage: ExtractionStage,
    private readonly moduleSources: ReadonlyMap<ValidatedModule, ModuleSource>,
    workflowState?: WorkflowState,
  ) {
    this.stage = stage
    this.workflowState = workflowState
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
      data: new RiviereProject(input.stage, moduleSources),
    }
  }

  static parseWorkflow(input: WorkflowProjectInput): RiviereProjectParseResult {
    const firstExtractionStage = input.stages.find((stage) => stage.kind === 'extract')
    if (firstExtractionStage === undefined) {
      return { success: false, error: 'Workflow must contain an extract stage' }
    }
    const parsedProject = this.parse({ stage: firstExtractionStage.stage })
    if (!parsedProject.success) return parsedProject
    return {
      success: true,
      data: new RiviereProject(
        parsedProject.data.stage,
        parsedProject.data.moduleSources,
        WorkflowState.parse(input),
      ),
    }
  }

  extractDraftComponents(options: {
    sourceFileSelection?: SourceFileSelection
    allowIncomplete: boolean
    includeConnections: boolean
  }): ExtractionOutcome {
    const selectedModuleSources = this.selectedModuleSources(
      options.sourceFileSelection ?? { kind: 'all' },
    )
    const draftComponents = this.stage.resolvedConfig.modules.flatMap((module) => {
      const source = this.sourceFor(module)
      const selectedFiles = sourceForModule(selectedModuleSources, module).files
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

  rebuildGraph(graphBuilder: GraphBuilder): RebuildGraphResult {
    const components: EnrichedComponent[] = []
    for (const stage of this.rebuildStages()) {
      if (stage.kind === 'extract') {
        const extraction = new ExtractComponentsForGraph().execute(stage.stage, {
          allowIncomplete: false,
        })
        if (!extraction.ok) return { ok: false, failure: extraction.failure }
        graphBuilder.addComponents(extraction.repository, extraction.components)
        components.push(...extraction.components)
        continue
      }
      if (stage.kind === 'link') {
        const connections = new DetectExtractionConnections().execute(stage.stage, components, {
          allowIncomplete: false,
        })
        graphBuilder.addLinks(connections.links, connections.externalLinks)
        continue
      }
      graphBuilder.validate()
    }
    return { ok: true, graph: graphBuilder.build() }
  }

  private rebuildStages(): readonly WorkflowStage[] {
    return (
      this.workflowState?.stages ??
      [
        WorkflowStage.parse({ kind: 'extract', stage: this.stage }),
        WorkflowStage.parse({ kind: 'link', stage: this.stage }),
        WorkflowStage.parse({ kind: 'validate' }),
      ]
    )
  }

  enrichDraftComponents(options: {
    draftComponentsPath: string
    loadDraftComponents: LoadDraftComponents
    allowIncomplete: boolean
    includeConnections: boolean
  }): ExtractionOutcome {
    const loadedDraftComponents = options.loadDraftComponents(options.draftComponentsPath)
    if (!loadedDraftComponents.success)
      return { kind: 'draftComponentsFailure', message: loadedDraftComponents.error }
    if (!Array.isArray(loadedDraftComponents.draftComponents)) {
      return {
        kind: 'draftComponentsFailure',
        message: `Draft components file must contain an array: ${options.draftComponentsPath}`,
      }
    }
    const draftComponents = []
    for (const draftComponent of loadedDraftComponents.draftComponents) {
      const parsedDraftComponent = DraftComponent.parse(draftComponent)
      if (!parsedDraftComponent.success) {
        return {
          kind: 'draftComponentsFailure',
          message: `${parsedDraftComponent.error}: ${options.draftComponentsPath}`,
        }
      }
      draftComponents.push(parsedDraftComponent.data)
    }
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
