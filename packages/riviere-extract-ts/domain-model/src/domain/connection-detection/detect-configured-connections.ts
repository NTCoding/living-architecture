import type {
  EventPublisherConfig,
  HttpLinkConfig,
} from '@living-architecture/riviere-extract-config-published-language'
import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { Project } from 'ts-morph'
import type { EnrichedComponent } from '../value-extraction/enriched-component'
import {
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
  readonly files: readonly string[]
  readonly project: Project
  readonly components: readonly EnrichedComponent[]
}

type ConfiguredConnectionsResult = {
  readonly links: ExtractedLink[]
  readonly externalLinks: ExternalLink[]
}

type ConfiguredConnectionsOptions = {
  readonly allowIncomplete: boolean
  readonly eventPublishers?: EventPublisherConfig[]
  readonly httpLinks?: HttpLinkConfig[]
  readonly repository: string
}

/** @riviere-role domain-service */
export function detectConfiguredConnections(
  sources: readonly ConfiguredConnectionSource[],
  allComponents: readonly EnrichedComponent[],
  options: ConfiguredConnectionsOptions,
): ConfiguredConnectionsResult {
  const perModuleResults = sources
    .filter((source) => source.components.length > 0)
    .map((source) => detectPerModule(source, allComponents, options))
  const crossModuleResult = detectCrossModule(allComponents, options)
  return combineResults(perModuleResults, crossModuleResult)
}

function detectPerModule(
  source: ConfiguredConnectionSource,
  allComponents: readonly EnrichedComponent[],
  options: ConfiguredConnectionsOptions,
) {
  return detectPerModuleConnections(
    source.project,
    source.components,
    perModuleOptions(source, allComponents, options),
  )
}

function perModuleOptions(
  source: ConfiguredConnectionSource,
  allComponents: readonly EnrichedComponent[],
  options: ConfiguredConnectionsOptions,
) {
  return PerModuleConnectionOptions.parse({
    allComponents,
    allowIncomplete: options.allowIncomplete,
    repository: options.repository,
    sourceFilePaths: [...source.files],
    ...(options.httpLinks === undefined ? {} : { httpLinks: options.httpLinks }),
  })
}

function detectCrossModule(
  allComponents: readonly EnrichedComponent[],
  options: ConfiguredConnectionsOptions,
) {
  return detectCrossModuleConnections(allComponents, crossModuleOptions(options))
}

function crossModuleOptions(options: ConfiguredConnectionsOptions) {
  return CrossModuleConnectionOptions.parse({
    allowIncomplete: options.allowIncomplete,
    repository: options.repository,
    ...(options.eventPublishers === undefined ? {} : { eventPublishers: options.eventPublishers }),
  })
}

function combineResults(
  perModuleResults: readonly ReturnType<typeof detectPerModuleConnections>[],
  crossModuleResult: ReturnType<typeof detectCrossModuleConnections>,
): ConfiguredConnectionsResult {
  return {
    links: deduplicateCrossStrategy([
      ...perModuleResults.flatMap((result) => result.links),
      ...crossModuleResult.links,
    ]),
    externalLinks: perModuleResults.flatMap((result) => result.externalLinks),
  }
}
