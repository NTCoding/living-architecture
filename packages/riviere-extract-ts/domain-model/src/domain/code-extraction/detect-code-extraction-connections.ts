import type {
  EventPublisherConfig,
  HttpLinkConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import { AsyncDetectionOptions } from '../connection-detection/async-detection/async-detection-options'
import { ComponentIndex } from '../connection-detection/component-index'
import { ConnectionDetectionResult } from '../connection-detection/connection-detection-result'
import type { HttpLinkResolutionResult } from '../connection-detection/http-link-resolution-result'
import { ScopedCallGraph } from '../connection-detection/call-graph/scoped-call-graph'
import type { ExtractedLink } from '../connection-detection/extracted-link'
import type { ExtractionConfiguration } from '../extraction-configuration'
import type { CodeExtractionModules } from '../ports/code-extraction-modules'
import type { ObserveConnectionDetectionPhase } from '../ports/observe-connection-detection-phase'
import type { EnrichedComponent } from '../value-extraction/enriched-component'

type ConnectionDetection = Readonly<{
  links: readonly ExtractedLink[]
  externalLinks: readonly ExternalLink[]
}>

type ConnectionDetectionCapabilities = Readonly<{
  detectConnectionsFromCalls: (
    graph: ScopedCallGraph,
    repository: string,
  ) => readonly ExtractedLink[]
  resolveHttpLinks: (
    links: readonly ExtractedLink[],
    components: readonly EnrichedComponent[],
    httpLinkConfigs: readonly HttpLinkConfig[],
  ) => HttpLinkResolutionResult
  detectEventPublisherConnections: (
    components: readonly EnrichedComponent[],
    eventPublishers: readonly EventPublisherConfig[],
    options: AsyncDetectionOptions,
  ) => readonly ExtractedLink[]
  detectSubscribeConnections: (
    components: readonly EnrichedComponent[],
    options: AsyncDetectionOptions,
  ) => readonly ExtractedLink[]
}>

type ConnectionDetectionInput = Readonly<{
  extraction: ExtractionConfiguration
  modules: CodeExtractionModules
  components: readonly EnrichedComponent[]
  allowIncomplete: boolean
  observeConnectionDetectionPhase?: ObserveConnectionDetectionPhase
}> &
  ConnectionDetectionCapabilities

/**
 * @riviere-role domain-service
 * @riviere-role-justification Connection detection composes stage-scoped parser modules through a port and returns graph values. The Project supplies the detection capabilities and owns graph mutation, so no aggregate or value object owns this cross-module behaviour.
 */
export function detectCodeExtractionConnections(
  input: ConnectionDetectionInput,
): ConnectionDetection {
  const observe = input.observeConnectionDetectionPhase
  return observePhase(observe, 'total', () => {
    const componentIndex = observePhase(observe, 'setup', () =>
      ComponentIndex.parse(input.components),
    )
    const strict = !input.allowIncomplete
    const scopedCallGraphs = observePhase(observe, 'callGraph', () =>
      buildScopedCallGraphs(input, componentIndex, strict),
    )
    return observePhase(observe, 'detection', () =>
      resolveDetection(input, scopedCallGraphs, strict),
    )
  })
}

function buildScopedCallGraphs(
  input: ConnectionDetectionInput,
  componentIndex: ComponentIndex,
  strict: boolean,
): ScopedCallGraph[] {
  return input.modules.map((module) => {
    const components = input.components.filter((component) => module.owns(component))
    return ScopedCallGraph.from({
      project: module.typeScriptProject(),
      sourceFilePaths: module.sourceFilePaths(),
      components,
      componentIndex,
      strict,
    })
  })
}

function resolveDetection(
  input: ConnectionDetectionInput,
  scopedCallGraphs: readonly ScopedCallGraph[],
  strict: boolean,
): ConnectionDetection {
  const connectionsDetectedFromCalls = scopedCallGraphs.flatMap((graph) =>
    input.detectConnectionsFromCalls(graph, input.extraction.repositoryName),
  )
  const asyncOptions = AsyncDetectionOptions.parse({
    strict,
    repository: input.extraction.repositoryName,
  })
  const connectionsDetectedFromEvents = [
    ...input.detectEventPublisherConnections(
      input.components,
      input.extraction.resolvedConfig.connections?.eventPublishers ?? [],
      asyncOptions,
    ),
    ...input.detectSubscribeConnections(input.components, asyncOptions),
  ]
  const resolvedHttpConnections = input.resolveHttpLinks(
    connectionsDetectedFromCalls,
    input.components,
    input.extraction.resolvedConfig.connections?.httpLinks ?? [],
  )
  return ConnectionDetectionResult.parse({
    links: [...resolvedHttpConnections.links, ...connectionsDetectedFromEvents],
    externalLinks: resolvedHttpConnections.externalLinks,
  })
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
