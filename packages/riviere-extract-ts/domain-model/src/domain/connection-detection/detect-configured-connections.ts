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

type DetectConfiguredConnectionsInput = {
  readonly sources: readonly ConfiguredConnectionSource[]
  readonly allComponents: readonly EnrichedComponent[]
  readonly options: ConfiguredConnectionsOptions
}

type PerModuleResults = readonly ReturnType<typeof detectPerModuleConnections>[]

type PerModuleDetectionInput = {
  readonly sources: readonly ConfiguredConnectionSource[]
  readonly allComponents: readonly EnrichedComponent[]
  readonly options: ConfiguredConnectionsOptions
}

type PerModuleOptionsInput = {
  readonly source: ConfiguredConnectionSource
  readonly allComponents: readonly EnrichedComponent[]
  readonly options: ConfiguredConnectionsOptions
}

type CombinedResultsInput = {
  readonly perModuleResults: PerModuleResults
  readonly crossModuleResult: ReturnType<typeof detectCrossModuleConnections>
}

/** @riviere-role domain-service */
export function detectConfiguredConnections(
  input: DetectConfiguredConnectionsInput,
): ConfiguredConnectionsResult {
  const { sources, allComponents, options } = input
  const perModuleResults = detectPerModuleResults({ sources, allComponents, options })
  const crossModuleResult = detectCrossModule(allComponents, options)
  return combineResults({ perModuleResults, crossModuleResult })
}

function detectPerModuleResults(input: PerModuleDetectionInput): PerModuleResults {
  const { sources, allComponents, options } = input
  const perModuleResults = []
  for (const source of sources) {
    const components = source.components
    if (components.length > 0) {
      perModuleResults.push(detectPerModule(source, allComponents, options))
    }
  }
  return perModuleResults
}

function detectPerModule(
  source: ConfiguredConnectionSource,
  allComponents: readonly EnrichedComponent[],
  options: ConfiguredConnectionsOptions,
) {
  return detectPerModuleConnections(
    source.project,
    source.components,
    perModuleOptions({ source, allComponents, options }),
  )
}

function perModuleOptions(input: PerModuleOptionsInput) {
  const { source, allComponents, options } = input
  const httpLinks = options.httpLinks
  return PerModuleConnectionOptions.parse({
    allComponents,
    allowIncomplete: options.allowIncomplete,
    repository: options.repository,
    sourceFilePaths: [...source.files],
    ...(httpLinks === undefined ? {} : { httpLinks }),
  })
}

function detectCrossModule(
  allComponents: readonly EnrichedComponent[],
  options: ConfiguredConnectionsOptions,
) {
  return detectCrossModuleConnections(allComponents, crossModuleOptions(options))
}

function crossModuleOptions(options: ConfiguredConnectionsOptions) {
  const eventPublishers = options.eventPublishers
  return CrossModuleConnectionOptions.parse({
    allowIncomplete: options.allowIncomplete,
    repository: options.repository,
    ...(eventPublishers === undefined ? {} : { eventPublishers }),
  })
}

function combineResults(input: CombinedResultsInput): ConfiguredConnectionsResult {
  const { perModuleResults, crossModuleResult } = input
  const { links, externalLinks } = combinePerModuleResults(perModuleResults)
  return {
    links: deduplicateCrossStrategy([...links, ...crossModuleResult.links]),
    externalLinks,
  }
}

function combinePerModuleResults(perModuleResults: PerModuleResults): ConfiguredConnectionsResult {
  const moduleLinks: ExtractedLink[] = []
  const externalLinks: ExternalLink[] = []
  for (const result of perModuleResults) {
    const links = result.links
    const resultExternalLinks = result.externalLinks
    moduleLinks.push(...links)
    externalLinks.push(...resultExternalLinks)
  }
  return {
    links: moduleLinks,
    externalLinks,
  }
}
