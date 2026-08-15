import type { EnrichedComponent } from './value-extraction/enriched-component'
import { detectConfiguredConnections } from './connection-detection/detect-configured-connections'
import type { ExtractionStage } from './extraction-stage'

type DetectExtractionConnectionsResult = ReturnType<typeof detectConfiguredConnections>

/** @riviere-role domain-service */
export class DetectExtractionConnections {
  execute(
    stage: ExtractionStage,
    allComponents: readonly EnrichedComponent[],
    options: { readonly allowIncomplete: false },
  ): DetectExtractionConnectionsResult {
    const sources = stage.moduleContexts.map((context) => ({
      domain: context.module.domain,
      files: context.files,
      project: context.project,
    }))
    const connections = stage.resolvedConfig.connections
    return detectConfiguredConnections(sources, allComponents, {
      allowIncomplete: options.allowIncomplete,
      repository: stage.repositoryName,
      ...(connections?.eventPublishers === undefined
        ? {}
        : { eventPublishers: connections.eventPublishers }),
      ...(connections?.httpLinks === undefined ? {} : { httpLinks: connections.httpLinks }),
    })
  }
}
