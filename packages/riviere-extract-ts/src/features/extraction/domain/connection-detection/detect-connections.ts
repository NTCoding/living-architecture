import { performance } from 'node:perf_hooks'
import type { Project } from 'ts-morph'
import type { EnrichedComponent } from '../value-extraction/enriched-component'
import { AsyncDetectionOptions } from './async-detection/async-detection-options'
import { detectEventPublisherConnections } from './async-detection/detect-event-publisher-connections'
import { detectSubscribeConnections } from './async-detection/detect-subscribe-connections'
import { buildCallGraph } from './call-graph/build-call-graph'
import { CallGraphOptions } from './call-graph/call-graph-types'
import { ComponentIndex } from './component-index'
import {
  ConnectionDetectionOptions,
  ConnectionDetectionResult,
  ConnectionTimings,
  CrossModuleConnectionOptions,
  CrossModuleDetectionResult,
  CrossModuleTimings,
  PerModuleConnectionOptions,
  PerModuleDetectionResult,
  PerModuleTimings,
} from './connection-detection-values'
import type { ExtractedLink } from './extracted-link'
import { resolveHttpLinks } from './resolve-http-links'

/** @riviere-role domain-service */
export function deduplicateCrossStrategy(links: ExtractedLink[]): ExtractedLink[] {
  const seen = new Map<string, ExtractedLink>()
  for (const link of links) {
    const key = `${link.source}|${link.target}|${link.type}`
    const existing = seen.get(key)
    if (existing !== undefined) {
      if (existing._uncertain !== undefined && link._uncertain === undefined) {
        seen.set(key, link)
      }
      continue
    }
    seen.set(key, link)
  }
  return [...seen.values()]
}

/** @riviere-role domain-service */
export function detectPerModuleConnections(
  project: Project,
  components: readonly EnrichedComponent[],
  options: PerModuleConnectionOptions,
): PerModuleDetectionResult {
  const setupStart = performance.now()
  const visibleComponents = options.allComponents ?? components
  const componentIndex = ComponentIndex.parse(visibleComponents)
  const sourceFilePaths = options.sourceFilePaths
  const setupMs = performance.now() - setupStart

  const strict = options.allowIncomplete !== true
  const repository = options.repository

  const callGraphStart = performance.now()
  const syncLinks = buildCallGraph(
    project,
    components,
    componentIndex,
    CallGraphOptions.parse({
      strict,
      sourceFilePaths,
      repository,
    }),
  )
  const callGraphMs = performance.now() - callGraphStart

  const httpLinkConfigs = options.httpLinks ?? []
  const resolved = resolveHttpLinks(syncLinks, visibleComponents, httpLinkConfigs)

  return PerModuleDetectionResult.parse({
    links: resolved.links,
    externalLinks: resolved.externalLinks,
    timings: PerModuleTimings.parse({
      callGraphMs,
      setupMs,
    }),
  })
}

/** @riviere-role domain-service */
export function detectCrossModuleConnections(
  allComponents: readonly EnrichedComponent[],
  options: CrossModuleConnectionOptions,
): CrossModuleDetectionResult {
  const strict = options.allowIncomplete !== true
  const repository = options.repository
  const asyncOptions = AsyncDetectionOptions.parse({
    strict,
    repository,
  })

  const asyncStart = performance.now()
  const publishLinks = detectEventPublisherConnections(
    allComponents,
    options.eventPublishers ?? [],
    asyncOptions,
  )
  const subscribeLinks = detectSubscribeConnections(allComponents, asyncOptions)
  const asyncDetectionMs = performance.now() - asyncStart

  return CrossModuleDetectionResult.parse({
    links: [...publishLinks, ...subscribeLinks],
    timings: CrossModuleTimings.parse({ asyncDetectionMs }),
  })
}

/** @riviere-role domain-service */
export function detectConnections(
  project: Project,
  components: readonly EnrichedComponent[],
  options: ConnectionDetectionOptions,
): ConnectionDetectionResult {
  const totalStart = performance.now()

  const setupStart = performance.now()
  const componentIndex = ComponentIndex.parse(components)
  const sourceFilePaths = options.sourceFilePaths
  const setupMs = performance.now() - setupStart

  const strict = options.allowIncomplete !== true
  const repository = options.repository

  const callGraphStart = performance.now()
  const syncLinks = buildCallGraph(
    project,
    components,
    componentIndex,
    CallGraphOptions.parse({
      strict,
      sourceFilePaths,
      repository,
    }),
  )
  const callGraphMs = performance.now() - callGraphStart

  const asyncOptions = AsyncDetectionOptions.parse({
    strict,
    repository,
  })
  const asyncStart = performance.now()
  const publishLinks = detectEventPublisherConnections(
    components,
    options.eventPublishers ?? [],
    asyncOptions,
  )
  const subscribeLinks = detectSubscribeConnections(components, asyncOptions)
  const asyncDetectionMs = performance.now() - asyncStart

  const allLinks = [...syncLinks, ...publishLinks, ...subscribeLinks]
  const deduplicatedLinks = deduplicateCrossStrategy(allLinks)
  const httpLinkConfigs = options.httpLinks ?? []
  const resolved = resolveHttpLinks(deduplicatedLinks, components, httpLinkConfigs)
  const totalMs = performance.now() - totalStart

  return ConnectionDetectionResult.parse({
    links: resolved.links,
    externalLinks: resolved.externalLinks,
    timings: ConnectionTimings.parse({
      callGraphMs,
      asyncDetectionMs,
      setupMs,
      totalMs,
    }),
  })
}
