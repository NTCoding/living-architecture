import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { EnrichedComponent } from './value-extraction/enriched-component'
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
import type { ExtractionStage } from './extraction-stage'

interface DetectExtractionConnectionsResult {
  readonly links: ExtractedLink[]
  readonly externalLinks: ExternalLink[]
  readonly timings: ConnectionTimings[]
}

/** @riviere-role domain-service */
export class DetectExtractionConnections {
  execute(
    stage: ExtractionStage,
    allComponents: readonly EnrichedComponent[],
    options: { readonly allowIncomplete: false },
  ): DetectExtractionConnectionsResult {
    const links: ExtractedLink[] = []
    const externalLinks: ExternalLink[] = []
    const timings: ConnectionTimings[] = []
    const httpLinks = stage.resolvedConfig.connections?.httpLinks ?? []

    for (const module of stage.resolvedConfig.modules) {
      const context = stage.moduleContexts.find(
        (candidate) => candidate.module.name === module.name,
      )
      if (context === undefined) {
        throw new TypeError(`Missing context for module '${module.name}'`)
      }
      const moduleComponents = allComponents.filter((component) => component.module === module.name)
      if (moduleComponents.length === 0) {
        continue
      }

      const result = detectPerModuleConnections(
        context.project,
        moduleComponents,
        PerModuleConnectionOptions.parse({
          allComponents,
          allowIncomplete: options.allowIncomplete,
          httpLinks,
          repository: stage.repositoryName,
          sourceFilePaths: [...context.files],
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

    const eventPublishers = stage.resolvedConfig.connections?.eventPublishers
    const crossResult = detectCrossModuleConnections(
      allComponents,
      CrossModuleConnectionOptions.parse({
        allowIncomplete: options.allowIncomplete,
        repository: stage.repositoryName,
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
}
