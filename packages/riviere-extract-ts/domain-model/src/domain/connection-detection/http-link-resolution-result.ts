import type { ExternalLink } from '@living-architecture/riviere-schema/schema'
import type { ExtractedLink } from './extracted-link'

/** @riviere-role value-object */
export class HttpLinkResolutionResult {
  declare private brand: 'HttpLinkResolutionResult'
  readonly links: ExtractedLink[]
  readonly externalLinks: ExternalLink[]

  static parse(params: {
    links: ExtractedLink[]
    externalLinks: ExternalLink[]
  }): HttpLinkResolutionResult {
    return new HttpLinkResolutionResult(params)
  }

  private constructor(params: { links: ExtractedLink[]; externalLinks: ExternalLink[] }) {
    this.links = params.links
    this.externalLinks = params.externalLinks
  }
}
