import type { Project } from 'ts-morph'
import type { ValidatedModule } from '@living-architecture/riviere-extract-config-published-language'
import { DraftComponent } from './component-extraction/draft-component'
import { extractComponents, resolveModuleName } from './component-extraction/extractor'
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
import { enrichComponentsForModules } from './enrich-components-for-modules'
import { MissingModuleSourceError } from './extraction-errors'
import type { EnrichedComponent } from './value-extraction/enriched-component'
import type { ExtractionStage } from './extraction-stage'
import type { LoadDraftComponents } from './ports/load-draft-components'
import type { ObserveConnectionDetectionPhase } from './ports/observe-connection-detection-phase'

type ModuleSource = Readonly<{ files: readonly string[]; project: Project }>

export { OrphanedDraftComponentError } from './orphaned-draft-component-error'

/** @riviere-role aggregate */
export class RiviereProject {
  private constructor(
    private readonly stage: ExtractionStage,
    private readonly moduleSources: ReadonlyMap<ValidatedModule, ModuleSource>,
  ) {}

  static parse(input: { stage: ExtractionStage }) {
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
        success: false as const,
        error: [
          ...missingSources.map((module) => `Missing source for module '${module.name}'`),
          ...foreignSources.map((module) => `Source supplied for unknown module '${module.name}'`),
        ].join('\n'),
      }
    }

    return {
      success: true as const,
      data: new RiviereProject(input.stage, moduleSources),
    }
  }

  extractDraftComponents(options: {
    sourceFileSelection?: SourceFileSelection
    allowIncomplete: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
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
        kind: 'draftOnly' as const,
        components: draftComponents,
      }
    }

    const enrichment = enrichComponentsForModules(
      this.stage.resolvedConfig.modules,
      this.moduleContexts,
      groupDraftComponentsByModule(
        draftComponents,
        this.stage.resolvedConfig.modules,
        selectedModuleSources,
      ),
      options.allowIncomplete,
    )
    if (enrichment.kind === 'fieldFailure') {
      return { kind: 'fieldFailure' as const, failedFields: enrichment.failedFields }
    }

    const connectionResult = this.detectConnections(
      enrichment.components,
      options.allowIncomplete,
      options.observeConnectionDetectionPhase,
    )
    const httpLinks = this.stage.resolvedConfig.connections?.httpLinks ?? []
    const visibleComponents = stripResolvedCustomTypes(
      enrichment.components,
      httpLinks,
      connectionResult.links,
    )

    return {
      kind: 'full' as const,
      components: visibleComponents,
      failedFields: enrichment.failedFields,
      links: connectionResult.links,
      externalLinks: connectionResult.externalLinks,
    }
  }

  enrichDraftComponents(options: {
    draftComponentsPath: string
    loadDraftComponents: LoadDraftComponents
    allowIncomplete: boolean
    includeConnections: boolean
    observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
  }) {
    const loadedDraftComponents = options.loadDraftComponents(options.draftComponentsPath)
    if (!loadedDraftComponents.success)
      return { kind: 'draftComponentsFailure' as const, message: loadedDraftComponents.error }
    if (!Array.isArray(loadedDraftComponents.draftComponents)) {
      return {
        kind: 'draftComponentsFailure' as const,
        message: `Draft components file must contain an array: ${options.draftComponentsPath}`,
      }
    }
    const draftComponents = []
    for (const draftComponent of loadedDraftComponents.draftComponents) {
      const parsedDraftComponent = DraftComponent.parse(draftComponent)
      if (!parsedDraftComponent.success) {
        return {
          kind: 'draftComponentsFailure' as const,
          message: `${parsedDraftComponent.error}: ${options.draftComponentsPath}`,
        }
      }
      draftComponents.push(parsedDraftComponent.data)
    }
    if (!options.includeConnections) {
      return {
        kind: 'draftOnly' as const,
        components: draftComponents,
      }
    }

    const enrichment = enrichComponentsForModules(
      this.stage.resolvedConfig.modules,
      this.moduleContexts,
      groupDraftComponentsByModule(
        draftComponents,
        this.stage.resolvedConfig.modules,
        this.moduleSources,
      ),
      options.allowIncomplete,
    )
    if (enrichment.kind === 'fieldFailure') {
      return { kind: 'fieldFailure' as const, failedFields: enrichment.failedFields }
    }

    const connectionResult = this.detectConnections(
      enrichment.components,
      options.allowIncomplete,
      options.observeConnectionDetectionPhase,
    )
    const httpLinks = this.stage.resolvedConfig.connections?.httpLinks ?? []
    const visibleComponents = stripResolvedCustomTypes(
      enrichment.components,
      httpLinks,
      connectionResult.links,
    )

    return {
      kind: 'full' as const,
      components: visibleComponents,
      failedFields: enrichment.failedFields,
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

  private get moduleContexts() {
    return this.stage.moduleContexts.map(({ module, project }) => ({ module, project }))
  }

  private buildScopedCallGraphs(
    enrichedComponents: readonly EnrichedComponent[],
    componentIndex: ComponentIndex,
    strict: boolean,
  ): ScopedCallGraph[] {
    return this.stage.resolvedConfig.modules.map((module) => {
      const source = this.sourceFor(module)
      const components = enrichedComponents.filter((component) =>
        componentBelongsToModule(component, module, source.files),
      )
      return buildScopedCallGraph({
        project: source.project,
        sourceFilePaths: source.files,
        components,
        componentIndex,
        strict,
      })
    })
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

function groupDraftComponentsByModule(
  draftComponents: readonly DraftComponent[],
  modules: readonly ValidatedModule[],
  moduleSources: ReadonlyMap<ValidatedModule, ModuleSource>,
): ReadonlyMap<string, readonly DraftComponent[]> {
  const grouped = new Map<string, DraftComponent[]>()
  for (const module of modules) {
    const source = sourceForModule(moduleSources, module)
    const moduleDrafts = draftComponents.filter((component) =>
      componentBelongsToModule(component, module, source.files),
    )
    if (moduleDrafts.length > 0) grouped.set(module.name, moduleDrafts)
  }
  const matchedDrafts = new Set([...grouped.values()].flat())
  const unmatchedDrafts = draftComponents.filter((draft) => !matchedDrafts.has(draft))
  if (unmatchedDrafts.length > 0) {
    throw new OrphanedDraftComponentError(
      [...new Set(unmatchedDrafts.map((draft) => draft.domain))],
      modules.map((module) => module.domain),
      'domains',
    )
  }
  return grouped
}

function componentBelongsToModule(
  component: Pick<DraftComponent, 'domain' | 'location' | 'module'>,
  module: ValidatedModule,
  files: readonly string[],
): boolean {
  const isConfiguredFile = files.length === 0 || files.includes(component.location.file)
  if (!isConfiguredFile || component.domain !== module.domain) return false
  const resolvedModule =
    files.length === 0 ? module.name : resolveModuleName(component.location.file, module)
  return resolvedModule === component.module
}
