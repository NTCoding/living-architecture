import type { ExternalLink } from '@living-architecture/riviere-schema'
import type { ExtractedLink } from './extracted-link'

/** @riviere-role value-object */
export class HttpLinkResolutionResult {
  declare private brand: 'HttpLinkResolutionResult'
  readonly links: ExtractedLink[]
  readonly externalLinks: ExternalLink[]

  constructor(params: {
    links: ExtractedLink[];
    externalLinks: ExternalLink[] 
  }) {
    this.links = params.links
    this.externalLinks = params.externalLinks
  }
}
