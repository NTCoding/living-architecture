import type { Link } from '@living-architecture/riviere-schema-published-language/schema'
import { LinkId } from './link-id'

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function createLinkKey(link: Link): LinkId {
  if (link.id !== undefined) {
    return LinkId.parse(link.id)
  }
  return LinkId.parse(`${link.source}->${link.target}`)
}
