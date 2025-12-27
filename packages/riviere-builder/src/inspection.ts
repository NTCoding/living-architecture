import type {
  Component,
  CustomTypeDefinition,
  DomainMetadata,
  ExternalLink,
  Link,
  RiviereGraph,
  SourceInfo,
} from '@living-architecture/riviere-schema'
import { RiviereQuery, type ValidationResult } from '@living-architecture/riviere-query'
import type { BuilderStats, BuilderWarning } from './types'

interface InspectionGraph {
  version: string
  metadata: {
    name?: string
    description?: string
    generated?: string
    sources: SourceInfo[]
    domains: Record<string, DomainMetadata>
    customTypes: Record<string, CustomTypeDefinition>
  }
  components: Component[]
  links: Link[]
  externalLinks: ExternalLink[]
}

export function findOrphans(graph: InspectionGraph): string[] {
  const connectedIds = new Set<string>()

  for (const link of graph.links) {
    connectedIds.add(link.source)
    connectedIds.add(link.target)
  }

  for (const externalLink of graph.externalLinks) {
    connectedIds.add(externalLink.source)
  }

  return graph.components.filter((c) => !connectedIds.has(c.id)).map((c) => c.id)
}

export function calculateStats(graph: InspectionGraph): BuilderStats {
  const components = graph.components
  return {
    componentCount: components.length,
    componentsByType: {
      UI: components.filter((c) => c.type === 'UI').length,
      API: components.filter((c) => c.type === 'API').length,
      UseCase: components.filter((c) => c.type === 'UseCase').length,
      DomainOp: components.filter((c) => c.type === 'DomainOp').length,
      Event: components.filter((c) => c.type === 'Event').length,
      EventHandler: components.filter((c) => c.type === 'EventHandler').length,
      Custom: components.filter((c) => c.type === 'Custom').length,
    },
    linkCount: graph.links.length,
    externalLinkCount: graph.externalLinks.length,
    domainCount: Object.keys(graph.metadata.domains).length,
  }
}

export function findWarnings(graph: InspectionGraph): BuilderWarning[] {
  const warnings: BuilderWarning[] = []

  for (const id of findOrphans(graph)) {
    warnings.push({
      code: 'ORPHAN_COMPONENT',
      message: `Component '${id}' has no incoming or outgoing links`,
      componentId: id,
    })
  }

  const usedDomains = new Set(graph.components.map((c) => c.domain))
  for (const domain of Object.keys(graph.metadata.domains)) {
    if (!usedDomains.has(domain)) {
      warnings.push({
        code: 'UNUSED_DOMAIN',
        message: `Domain '${domain}' is declared but has no components`,
        domainName: domain,
      })
    }
  }

  return warnings
}

export function validateGraph(graph: InspectionGraph): ValidationResult {
  const hasCustomTypes = Object.keys(graph.metadata.customTypes).length > 0
  const hasExternalLinks = graph.externalLinks.length > 0

  const riviereGraph: RiviereGraph = {
    version: graph.version,
    metadata: {
      ...graph.metadata,
      sources: graph.metadata.sources,
      ...(hasCustomTypes && { customTypes: graph.metadata.customTypes }),
    },
    components: graph.components,
    links: graph.links,
    ...(hasExternalLinks && { externalLinks: graph.externalLinks }),
  }

  return new RiviereQuery(riviereGraph).validate()
}
