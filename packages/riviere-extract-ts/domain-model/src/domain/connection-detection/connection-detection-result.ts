import type { ExternalLink } from '@living-architecture/riviere-schema-published-language/schema'
import type { ExtractedLink } from './extracted-link'

/** @riviere-role value-object */
export class ConnectionDetectionResult {
  declare private readonly brand: 'ConnectionDetectionResult'
  readonly links: readonly ExtractedLink[]
  readonly externalLinks: readonly ExternalLink[]

  static parse(params: {
    links: readonly ExtractedLink[]
    externalLinks: readonly ExternalLink[]
  }): ConnectionDetectionResult {
    return new ConnectionDetectionResult(params)
  }

  private constructor(params: {
    links: readonly ExtractedLink[]
    externalLinks: readonly ExternalLink[]
  }) {
    this.links = deduplicateConnections(params.links)
    this.externalLinks = params.externalLinks
  }
}

function deduplicateConnections(links: readonly ExtractedLink[]): ExtractedLink[] {
  const linksByIdentity = new Map<string, ExtractedLink>()
  for (const link of links) {
    const key = `${link.source}|${link.target}|${link.type}`
    const existing = linksByIdentity.get(key)
    if (
      existing === undefined ||
      (existing._uncertain !== undefined && link._uncertain === undefined)
    ) {
      linksByIdentity.set(key, link)
    }
  }
  return [...linksByIdentity.values()]
}
