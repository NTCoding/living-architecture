import type { Project } from 'ts-morph'
import { DraftComponent } from './component-extraction/draft-component'
import { AsyncDetectionOptions } from './connection-detection/async-detection/async-detection-options'
import { detectEventPublisherConnections } from './connection-detection/async-detection/detect-event-publisher-connections'
import { detectSubscribeConnections } from './connection-detection/async-detection/detect-subscribe-connections'
import { ComponentIndex } from './connection-detection/component-index'
import { ConnectionDetectionResult } from './connection-detection/connection-detection-result'
import { detectCallsInCallable } from './connection-detection/call-graph/detect-calls-in-callable'
import { detectConnectionsFromCalls } from './connection-detection/call-graph/detect-connections-from-calls'
import { locateComponentCallables } from './connection-detection/call-graph/locate-component-callables'
import { resolveCallTargets } from './connection-detection/call-graph/resolve-call-targets'
import {
  ScopedCallGraph,
  ScopedCallGraphEdge,
  UnresolvedScopedCall,
} from './connection-detection/call-graph/scoped-call-graph'
import type { ComponentCallable } from './connection-detection/call-graph/scoped-call-graph'
import type { CallableReference } from './connection-detection/call-graph/callable-reference'
import type { CallSite } from './connection-detection/call-graph/call-graph-types'
import {
  resolveHttpLinks,
  stripResolvedCustomTypes,
} from './connection-detection/resolve-http-links'
import { OrphanedDraftComponentError } from './orphaned-draft-component-error'
import { MissingModuleSourceError } from './extraction-errors'
import {
  type EnrichedComponent,
  EnrichmentResult,
} from './value-extraction/enriched-component'
import type { ExtractionStage } from './extraction-stage'
import type { ObserveConnectionDetectionPhase } from './ports/observe-connection-detection-phase'
import { RiviereModule } from './riviere-module'

export { OrphanedDraftComponentError } from './orphaned-draft-component-error'

/** @riviere-role aggregate */
export class RiviereProject {
  private constructor(
    private readonly stage: ExtractionStage,
    private readonly modules: readonly RiviereModule[],
    private unassignedDraftComponents: readonly DraftComponent[],
  ) {}

  static parse(input: { stage: ExtractionStage; draftComponents: readonly DraftComponent[] }) {
    const configuredModules = new Set(input.stage.resolvedConfig.modules)
    const moduleContexts = new Map(
      input.stage.moduleContexts.map((context) => [context.module, context] as const),
    )
    const configuredModuleContexts = input.stage.resolvedConfig.modules.flatMap(
      (configuration) => {
        const context = moduleContexts.get(configuration)
        return context === undefined ? [] : [{ configuration, context }]
      },
    )
    const missingSources = input.stage.resolvedConfig.modules.filter(
      (module) => !moduleContexts.has(module),
    )
    const foreignSources = [...moduleContexts.keys()].filter(
      (module) => !configuredModules.has(module),
    )
    if (missingSources.length > 0 || foreignSources.length > 0) {
      return {
        success: false as const,
        error: [
          ...missingSources.map((module) => `Missing source for module '${module.name}'`),
          ...foreignSources.map((module) => `Source supplied for unknown module '${module.name}'`),
        ].join('\n'),
      }
    }

    const modules = configuredModuleContexts.map(({ configuration, context }) => {
      return RiviereModule.build({
        configuration,
        project: context.project,
        sourceFiles: context.files,
        candidateDraftComponents: input.draftComponents,
      })
    })
    const assignedDraftComponents = new Set(
      modules.flatMap((module) => module.draftComponents()),
    )
    const unassignedDraftComponents = input.draftComponents.filter(
      (component) => !assignedDraftComponents.has(component),
    )
    return {
      success: true as const,
      data: new RiviereProject(input.stage, modules, unassignedDraftComponents),
    }
  }

  extractDraftComponents(options: {
    sourceFileSelection?: SourceFileSelection
    allowIncomplete: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    this.assertEveryConfiguredModuleHasAnEntity()
    const selection = options.sourceFileSelection ?? { kind: 'all' as const }
    const draftComponents = this.modules.flatMap((module) =>
      selection.kind === 'all'
        ? module.extractAllDraftComponents()
        : module.extractDraftComponentsFrom(new Set(selection.filePaths)),
    )
    this.unassignedDraftComponents = []

    if (!options.includeConnections) {
      return {
        kind: 'draftOnly' as const,
        components: draftComponents,
      }
    }

    return this.enrichDraftComponentsAndDetectConnections(options)
  }

  enrichDraftComponents(options: {
    allowIncomplete: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    this.assertEveryConfiguredModuleHasAnEntity()
    const draftComponents = this.modules.flatMap((module) => module.draftComponents())
    if (!options.includeConnections) {
      return {
        kind: 'draftOnly' as const,
        components: draftComponents,
      }
    }

    return this.enrichDraftComponentsAndDetectConnections(options)
  }

  private enrichDraftComponentsAndDetectConnections(options: {
    allowIncomplete: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    this.assertNoUnassignedDraftComponents()
    const enrichment = EnrichmentResult.mergeModuleResults(
      this.modules
        .filter((module) => module.draftComponents().length > 0)
        .map((module) => module.enrichDraftComponents()),
    )
    const failedFields = enrichment.failedFieldNames()
    if (enrichment.hasFailures() && !options.allowIncomplete) {
      return { kind: 'fieldFailure' as const, failedFields }
    }
    const connectionResult = this.detectConnections(
      enrichment.components,
      options.allowIncomplete,
      options.observeConnectionDetectionPhase,
    )
    const httpLinks = this.stage.resolvedConfig.connections?.httpLinks ?? []
    return {
      kind: 'full' as const,
      components: stripResolvedCustomTypes(
        enrichment.components,
        httpLinks,
        connectionResult.links,
      ),
      failedFields,
      links: connectionResult.links,
      externalLinks: connectionResult.externalLinks,
    }
  }

  public detectConnections(
    enrichedComponents: EnrichedComponent[],
    allowIncomplete: boolean,
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase,
  ) {
    return observePhase(observeConnectionDetectionPhase, 'total', () => {
      const componentIndex = observePhase(observeConnectionDetectionPhase, 'setup', () =>
        ComponentIndex.parse(enrichedComponents),
      )
      const strict = !allowIncomplete
      const scopedCallGraphs = observePhase(observeConnectionDetectionPhase, 'callGraph', () =>
        this.buildScopedCallGraphs(enrichedComponents, componentIndex, strict),
      )
      return observePhase(observeConnectionDetectionPhase, 'detection', () => {
        const connectionsDetectedFromCalls = scopedCallGraphs.flatMap((graph) =>
          detectConnectionsFromCalls(graph, this.stage.repositoryName),
        )
        const asyncOptions = AsyncDetectionOptions.parse({
          strict,
          repository: this.stage.repositoryName,
        })
        const connectionsDetectedFromEvents = [
          ...detectEventPublisherConnections(
            enrichedComponents,
            this.stage.resolvedConfig.connections?.eventPublishers ?? [],
            asyncOptions,
          ),
          ...detectSubscribeConnections(enrichedComponents, asyncOptions),
        ]
        const resolvedHttpConnections = resolveHttpLinks(
          connectionsDetectedFromCalls,
          enrichedComponents,
          this.stage.resolvedConfig.connections?.httpLinks ?? [],
        )
        return ConnectionDetectionResult.parse({
          links: [...resolvedHttpConnections.links, ...connectionsDetectedFromEvents],
          externalLinks: resolvedHttpConnections.externalLinks,
        })
      })
    })
  }

  private buildScopedCallGraphs(
    enrichedComponents: readonly EnrichedComponent[],
    componentIndex: ComponentIndex,
    strict: boolean,
  ): ScopedCallGraph[] {
    return this.modules.map((module) => {
      const components = enrichedComponents.filter((component) => module.owns(component))
      return buildScopedCallGraph({
        project: module.typeScriptProject(),
        sourceFilePaths: module.sourceFilePaths(),
        components,
        componentIndex,
        strict,
      })
    })
  }

  private assertEveryConfiguredModuleHasAnEntity(): void {
    for (const configuration of this.stage.resolvedConfig.modules) {
      if (!this.modules.some((module) => module.name() === configuration.name)) {
        throw new MissingModuleSourceError(configuration.name)
      }
    }
  }

  private assertNoUnassignedDraftComponents(): void {
    if (this.unassignedDraftComponents.length === 0) return
    throw new OrphanedDraftComponentError(
      [...new Set(this.unassignedDraftComponents.map((draft) => draft.domain))],
      this.modules.map((module) => module.domain()),
      'domains',
    )
  }
}

type SourceFileSelection =
  | { readonly kind: 'all' }
  | { readonly kind: 'files'; readonly filePaths: readonly string[] }

interface BuildScopedCallGraphInput {
  readonly project: Project
  readonly sourceFilePaths: readonly string[]
  readonly components: readonly EnrichedComponent[]
  readonly componentIndex: ComponentIndex
  readonly strict: boolean
}

function buildScopedCallGraph(input: BuildScopedCallGraphInput): ScopedCallGraph {
  const roots = locateComponentCallables(input.project, input.components)
  const edges: ScopedCallGraphEdge[] = []
  const unresolvedCalls: UnresolvedScopedCall[] = []
  for (const root of roots) {
    traceCallable({
      ...input,
      root,
      callable: root.callable,
      edges,
      unresolvedCalls,
      visited: new Set([root.callable.toKey()]),
    })
  }
  return ScopedCallGraph.parse({ roots, edges, unresolvedCalls })
}

function traceCallable(
  input: BuildScopedCallGraphInput & {
    readonly root: ComponentCallable
    readonly callable: CallableReference
    readonly edges: ScopedCallGraphEdge[]
    readonly unresolvedCalls: UnresolvedScopedCall[]
    readonly visited: ReadonlySet<string>
    readonly originCallSite?: CallSite
  },
): void {
  const calls = detectCallsInCallable(input.project, input.callable, input.strict)
  const targets = resolveCallTargets({
    calls,
    project: input.project,
    sourceFilePaths: input.sourceFilePaths,
    componentIndex: input.componentIndex,
    strict: input.strict,
  })
  for (const target of targets) {
    const originCallSite = input.originCallSite ?? target.call.callSite
    if (target.kind === 'unresolved') {
      const isRootCallable = input.callable.toKey() === input.root.callable.toKey()
      if (target.call.unresolvedReason !== undefined && !isRootCallable) continue
      input.unresolvedCalls.push(
        UnresolvedScopedCall.parse({
          sourceComponent: input.root.component,
          originCallSite,
          reason: target.reason ?? 'Call target unresolved',
        }),
      )
      continue
    }
    if (target.callable === undefined || target.kind === 'dead-end') continue
    input.edges.push(
      ScopedCallGraphEdge.parse({
        source: input.callable,
        target: target.callable,
        callSite: target.call.callSite,
        ...(target.component === undefined ? {} : { targetComponent: target.component }),
      }),
    )
    if (target.kind !== 'callable' || input.visited.has(target.callable.toKey())) continue
    traceCallable({
      ...input,
      callable: target.callable,
      originCallSite,
      visited: new Set([...input.visited, target.callable.toKey()]),
    })
  }
}

function observePhase<T>(
  observer: ObserveConnectionDetectionPhase | undefined,
  phase: 'setup' | 'callGraph' | 'detection' | 'total',
  operation: () => T,
): T {
  observer?.({ phase, status: 'started' })
  try {
    return operation()
  } finally {
    observer?.({ phase, status: 'completed' })
  }
}
