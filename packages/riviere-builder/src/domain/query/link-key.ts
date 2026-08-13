import type { Link } from '@living-architecture/riviere-schema/schema'
import { LinkId } from './link-id'

/** @riviere-role domain-service */
export function createLinkKey(link: Link): LinkId {
  if (link.id !== undefined) {
    return LinkId.parse(link.id)
  }
  return LinkId.parse(`${link.source}->${link.target}`)
}
