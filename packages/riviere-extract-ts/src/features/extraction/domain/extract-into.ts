import { posix } from 'node:path'
import type { Project } from 'ts-morph'
import type {
  Module, ResolvedExtractionConfig 
} from '@living-architecture/riviere-extract-config'
import type { ExternalLink } from '@living-architecture/riviere-schema'
import {
  deduplicateCrossStrategy,
  detectCrossModuleConnections,
  detectPerModuleConnections,
  type CrossModuleConnectionOptions,
  type ConnectionTimings,
} from './connection-detection/detect-connections'
import {
  extractComponents,
  type DraftComponent,
  type GlobMatcher,
} from './component-extraction/extractor'
import type { ExtractedLink } from './connection-detection/extracted-link'
import {
  createLinkWriteInput, type ExtractionWritePort 
} from './extraction-write-port'
import {
  toComponentWriteInput,
  toExtractionComponentId,
} from './extract-into-component-write-input'
import {
  enrichComponents,
  type EnrichedComponent,
  type EnrichmentFailure,
} from './value-extraction/enrich-components'

/** @riviere-role value-object */
export interface ExtractionModuleContext {
  module: Module
  files: string[]
  project: Project
}

/** @riviere-role value-object */
export interface ExtractIntoOptions {
  allowIncomplete: boolean
  configDir: string
  includeConnections: boolean
  mode: 'extract' | 'enrich'
  repository: string
  globMatcher: GlobMatcher
  moduleContexts: ExtractionModuleContext[]
  draftComponents?: DraftComponent[]
  disposeProjects?: boolean
}

interface DraftOnlyExtractionSummary {
  kind: 'draftOnly'
  components: DraftComponent[]
}

interface FullExtractionSummary {
  kind: 'full'
  components: EnrichedComponent[]
  failedFields: string[]
  links: ExtractedLink[]
  externalLinks: ExternalLink[]
  timings: ConnectionTimings[]
}

interface FieldFailureExtractionSummary {
  kind: 'fieldFailure'
  failedFields: string[]
}

/** @riviere-role value-object */
export type ExtractionSummary =
  | DraftOnlyExtractionSummary
  | FullExtractionSummary
  | FieldFailureExtractionSummary

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
  failures: EnrichmentFailure[]
}

interface SuccessfulEnrichment {
  kind: 'enriched'
  components: EnrichedComponent[]
  failedFields: string[]
  failures: EnrichmentFailure[]
}

type EnrichmentSummary = FieldFailureEnrichment | SuccessfulEnrichment

/** @riviere-role domain-service */
export function extractInto(
  writePort: ExtractionWritePort,
  config: ResolvedExtractionConfig,
  options: ExtractIntoOptions,
): ExtractionSummary {
  try {
    const draftComponents = loadDraftComponents(config, options)

    if (!options.includeConnections) {
      return {
        kind: 'draftOnly',
        components: draftComponents,
      }
    }

    const enrichment = enrichDraftComponents(draftComponents, config, options)
    if (enrichment.kind === 'fieldFailure') {
      reportFieldFailures(writePort, enrichment.failures)
      return {
        kind: 'fieldFailure',
        failedFields: enrichment.failedFields,
      }
    }

    const connectionResult = detectConnections(enrichment.components, config, options)
    writeCompleteExtraction(writePort, enrichment, connectionResult, options.repository)

    return {
      kind: 'full',
      components: enrichment.components,
      failedFields: enrichment.failedFields,
      links: connectionResult.links,
      externalLinks: connectionResult.externalLinks,
      timings: connectionResult.timings,
    }
  } finally {
    if (options.disposeProjects !== false) {
      disposeProjects(options.moduleContexts)
    }
  }
}

function loadDraftComponents(
  config: ResolvedExtractionConfig,
  options: ExtractIntoOptions,
): DraftComponent[] {
  if (options.mode === 'enrich') {
    return options.draftComponents ?? []
  }

  return options.moduleContexts.flatMap((moduleContext) =>
    extractComponents(
      moduleContext.project,
      moduleContext.files,
      config,
      options.globMatcher,
      options.configDir,
    ),
  )
}

function disposeProjects(moduleContexts: readonly ExtractionModuleContext[]): void {
  for (const moduleContext of moduleContexts) {
    if (hasDisposeMethod(moduleContext.project)) {
      moduleContext.project.dispose()
    }
  }
}

function hasDisposeMethod(project: Project): project is Project & { dispose: () => void } {
  return 'dispose' in project && typeof project.dispose === 'function'
}

function enrichDraftComponents(
  draftComponents: DraftComponent[],
  config: ResolvedExtractionConfig,
  options: ExtractIntoOptions,
): EnrichmentSummary {
  const moduleNames = new Set(
    options.moduleContexts.map((moduleContext) => moduleContext.module.name),
  )
  const draftsByModule = groupDraftsByModule(draftComponents)
  assertAllDraftsMatchModules(draftsByModule, moduleNames)

  const enrichedComponents: EnrichedComponent[] = []
  const failures: EnrichmentFailure[] = []
  const failedFields = new Set<string>()

  for (const moduleContext of options.moduleContexts) {
    const moduleDrafts = draftsByModule.get(moduleContext.module.name) ?? []
    if (moduleDrafts.length === 0) {
      continue
    }

    const enrichmentResult = enrichComponents(
      moduleDrafts,
      config,
      moduleContext.project,
      options.globMatcher,
      options.configDir,
    )

    enrichedComponents.push(...enrichmentResult.components)
    failures.push(...enrichmentResult.failures)

    for (const failure of enrichmentResult.failures) {
      failedFields.add(failure.field)
    }
  }

  const failedFieldList = [...failedFields]
  if (failedFieldList.length > 0 && !options.allowIncomplete) {
    return {
      kind: 'fieldFailure',
      failedFields: failedFieldList,
      failures,
    }
  }

  return {
    kind: 'enriched',
    components: enrichedComponents,
    failedFields: failedFieldList,
    failures,
  }
}

function detectConnections(
  enrichedComponents: EnrichedComponent[],
  config: ResolvedExtractionConfig,
  options: ExtractIntoOptions,
): {
  links: ExtractedLink[]
  externalLinks: ExternalLink[]
  timings: ConnectionTimings[]
} {
  const links: ExtractedLink[] = []
  const externalLinks: ExternalLink[] = []
  const timings: ConnectionTimings[] = []
  const httpLinks = config.connections?.httpLinks ?? []

  for (const moduleContext of options.moduleContexts) {
    const moduleComponents = enrichedComponents.filter(
      (component) => component.module === moduleContext.module.name,
    )
    if (moduleComponents.length === 0) {
      continue
    }

    const result = detectPerModuleConnections(
      moduleContext.project,
      moduleComponents,
      {
        allComponents: enrichedComponents,
        allowIncomplete: options.allowIncomplete,
        moduleGlobs: [posix.join(moduleContext.module.path, moduleContext.module.glob)],
        httpLinks,
        repository: options.repository,
      },
      options.globMatcher,
    )

    links.push(...result.links)
    externalLinks.push(...result.externalLinks)
    timings.push({
      callGraphMs: result.timings.callGraphMs,
      asyncDetectionMs: 0,
      setupMs: result.timings.setupMs,
      totalMs: result.timings.callGraphMs + result.timings.setupMs,
    })
  }

  const crossResult = detectCrossModuleConnections(
    enrichedComponents,
    createCrossModuleOptions(config, options),
  )
  links.push(...crossResult.links)
  timings.push({
    callGraphMs: 0,
    asyncDetectionMs: crossResult.timings.asyncDetectionMs,
    setupMs: 0,
    totalMs: crossResult.timings.asyncDetectionMs,
  })

  return {
    links: deduplicateCrossStrategy(links),
    externalLinks,
    timings,
  }
}

function createCrossModuleOptions(
  config: ResolvedExtractionConfig,
  options: ExtractIntoOptions,
): CrossModuleConnectionOptions {
  if (config.connections?.eventPublishers === undefined) {
    return {
      allowIncomplete: options.allowIncomplete,
      repository: options.repository,
    }
  }

  return {
    allowIncomplete: options.allowIncomplete,
    repository: options.repository,
    eventPublishers: config.connections.eventPublishers,
  }
}

function writeCompleteExtraction(
  writePort: ExtractionWritePort,
  enrichment: SuccessfulEnrichment,
  connectionResult: {
    links: ExtractedLink[]
    externalLinks: ExternalLink[]
  },
  repository: string,
): void {
  const failureReasons = indexFailureReasons(enrichment.failures)

  for (const component of enrichment.components) {
    reportMissingFields(writePort, component, failureReasons)

    const writeInput = toComponentWriteInput(component, repository)
    if (writeInput !== undefined) {
      writePort.addComponent(writeInput)
    }
  }

  for (const link of connectionResult.links) {
    if (link._uncertain !== undefined) {
      writePort.reportUncertainLink({
        source: link.source,
        target: link.target,
        linkType: link.type ?? 'sync',
        reason: link._uncertain,
      })
    }

    writePort.addLink(createLinkWriteInput(link.source, link.target, link.type))
  }

  for (const externalLink of connectionResult.externalLinks) {
    writePort.addExternalLink({
      from: externalLink.source,
      target: externalLink.target,
      ...(externalLink.type !== undefined && { type: externalLink.type }),
      ...(externalLink.description !== undefined && { description: externalLink.description }),
      ...(externalLink.sourceLocation !== undefined && {sourceLocation: externalLink.sourceLocation,}),
    })
  }
}

function reportFieldFailures(writePort: ExtractionWritePort, failures: EnrichmentFailure[]): void {
  for (const failure of failures) {
    writePort.reportMissingField({
      componentId: toExtractionComponentId(failure.component),
      field: failure.field,
      reason: withoutSourceLocation(failure.error),
    })
  }
}

function reportMissingFields(
  writePort: ExtractionWritePort,
  component: EnrichedComponent,
  failureReasons: Map<string, string>,
): void {
  if (component._missing === undefined) {
    return
  }

  const componentId = toExtractionComponentId(component)

  for (const field of component._missing) {
    const reason = failureReasons.get(createFailureKey(component, field))
    if (reason === undefined) {
      continue
    }

    writePort.reportMissingField({
      componentId,
      field,
      reason: withoutSourceLocation(reason),
    })
  }
}

function indexFailureReasons(failures: readonly EnrichmentFailure[]): Map<string, string> {
  const indexedFailures = new Map<string, string>()

  for (const failure of failures) {
    indexedFailures.set(createFailureKey(failure.component, failure.field), failure.error)
  }

  return indexedFailures
}

function createFailureKey(component: DraftComponent, field: string): string {
  return [
    component.type,
    component.domain,
    component.module,
    component.name,
    component.location.file,
    component.location.line.toString(),
    field,
  ].join('|')
}

function withoutSourceLocation(reason: string): string {
  return reason.replace(/ at .+?:\d+$/, '')
}

function groupDraftsByModule(
  draftComponents: readonly DraftComponent[],
): Map<string, DraftComponent[]> {
  const groupedDrafts = new Map<string, DraftComponent[]>()

  for (const component of draftComponents) {
    const moduleDrafts = groupedDrafts.get(component.module) ?? []
    moduleDrafts.push(component)
    groupedDrafts.set(component.module, moduleDrafts)
  }

  return groupedDrafts
}

function assertAllDraftsMatchModules(
  draftsByModule: Map<string, DraftComponent[]>,
  moduleNames: Set<string>,
): void {
  const orphanedModules = [...draftsByModule.keys()].filter(
    (moduleName) => !moduleNames.has(moduleName),
  )

  if (orphanedModules.length > 0) {
    throw new OrphanedDraftComponentError(orphanedModules, [...moduleNames])
  }
}
