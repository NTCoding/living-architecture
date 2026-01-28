import type { Link } from '@living-architecture/riviere-schema'
import type { LinkId } from './branded-types'
import { parseLinkId } from './branded-types'

export function createLinkKey(link: Link): LinkId {
  if (link.id !== undefined) {
    return parseLinkId(link.id)
  }
  return parseLinkId(`${link.source}->${link.target}`)
}
