import type {
  EventPublisherConfig,
  HttpLinkConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { Project } from 'ts-morph'
import type { EnrichedComponent } from '../value-extraction/enriched-component'
import {
  ConnectionTimings,
  CrossModuleConnectionOptions,
  PerModuleConnectionOptions,
} from './connection-detection-values'
import {
  deduplicateCrossStrategy,
  detectCrossModuleConnections,
  detectPerModuleConnections,
} from './detect-connections'
import type { ExtractedLink } from './extracted-link'

type ConfiguredConnectionSource = {
  readonly domain: string
  readonly files: readonly string[]
  readonly project: Project
}

type ConfiguredConnectionsResult = {
  readonly links: ExtractedLink[]
  readonly externalLinks: ExternalLink[]
  readonly timings: ConnectionTimings[]
}

/** @riviere-role domain-service */
export function detectConfiguredConnections(
  sources: readonly ConfiguredConnectionSource[],
  allComponents: readonly EnrichedComponent[],
  options: {
    readonly allowIncomplete: boolean
    readonly eventPublishers?: EventPublisherConfig[]
    readonly httpLinks?: HttpLinkConfig[]
    readonly repository: string
  },
): ConfiguredConnectionsResult {
  const links: ExtractedLink[] = []
  const externalLinks: ExternalLink[] = []
  const timings: ConnectionTimings[] = []

  for (const source of sources) {
    const moduleComponents = allComponents.filter((component) => component.domain === source.domain)
    if (moduleComponents.length === 0) {
      continue
    }

    const result = detectPerModuleConnections(
      source.project,
      moduleComponents,
      PerModuleConnectionOptions.parse({
        allComponents,
        allowIncomplete: options.allowIncomplete,
        repository: options.repository,
        sourceFilePaths: [...source.files],
        ...(options.httpLinks === undefined ? {} : { httpLinks: options.httpLinks }),
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

  const crossResult = detectCrossModuleConnections(
    allComponents,
    CrossModuleConnectionOptions.parse({
      allowIncomplete: options.allowIncomplete,
      repository: options.repository,
      ...(options.eventPublishers === undefined
        ? {}
        : { eventPublishers: options.eventPublishers }),
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
