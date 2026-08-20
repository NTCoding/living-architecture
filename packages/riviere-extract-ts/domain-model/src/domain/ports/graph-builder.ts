import type { ExternalLink, RiviereGraph } from '@living-architecture/riviere-schema-published-language/schema'
import type { ExtractedLink } from '../connection-detection/extracted-link'
import type { EnrichedComponent } from '../value-extraction/enriched-component'

/** @riviere-role domain-port */
export interface GraphBuilder {
  addComponents(repository: string, components: readonly EnrichedComponent[]): void
  addLinks(links: readonly ExtractedLink[], externalLinks: readonly ExternalLink[]): void
  validate(): void
  build(): RiviereGraph
}
