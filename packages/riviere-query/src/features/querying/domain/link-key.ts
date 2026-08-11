import type { Link } from '@living-architecture/riviere-schema'
import type { LinkId } from './identifiers'
import { parseLinkId } from './identifiers'

/** @riviere-role domain-service */
export function createLinkKey(link: Link): LinkId {
  if (link.id !== undefined) {
    return parseLinkId(link.id)
  }
  return parseLinkId(`${link.source}->${link.target}`)
}
