import type { RiviereGraph, Component, Link } from '@living-architecture/riviere-schema'
import type { ComponentModification, GraphDiff, LinkId } from './domain-types'
import { parseComponentId, parseLinkId } from './domain-types'

export function diffGraphs(current: RiviereGraph, other: RiviereGraph): GraphDiff {
  const thisIds = new Set(current.components.map((c) => c.id))
  const otherIds = new Set(other.components.map((c) => c.id))
  const otherById = new Map(other.components.map((c) => [c.id, c]))

  const added = other.components.filter((c) => !thisIds.has(c.id))
  const removed = current.components.filter((c) => !otherIds.has(c.id))
  const modified: ComponentModification[] = []

  for (const tc of current.components) {
    const oc = otherById.get(tc.id)
    if (oc === undefined) continue
    const changedFields = findChangedFields(tc, oc)
    if (changedFields.length > 0) {
      modified.push({ id: parseComponentId(tc.id), before: tc, after: oc, changedFields })
    }
  }

  const thisLinkKeys = new Set(current.links.map((l) => createLinkKey(l)))
  const otherLinkKeys = new Set(other.links.map((l) => createLinkKey(l)))
  const linksAdded = other.links.filter((l) => !thisLinkKeys.has(createLinkKey(l)))
  const linksRemoved = current.links.filter((l) => !otherLinkKeys.has(createLinkKey(l)))

  return {
    components: { added, removed, modified },
    links: { added: linksAdded, removed: linksRemoved },
    stats: {
      componentsAdded: added.length,
      componentsRemoved: removed.length,
      componentsModified: modified.length,
      linksAdded: linksAdded.length,
      linksRemoved: linksRemoved.length,
    },
  }
}

function createLinkKey(link: Link): LinkId {
  if (link.id !== undefined) {
    return parseLinkId(link.id)
  }
  return parseLinkId(`${link.source}->${link.target}`)
}

function findChangedFields(before: Component, after: Component): string[] {
  const beforeEntries = new Map(Object.entries(before))
  const afterEntries = new Map(Object.entries(after))
  const changedFields: string[] = []
  const allKeys = new Set([...beforeEntries.keys(), ...afterEntries.keys()])

  for (const key of allKeys) {
    if (key === 'id') continue
    if (JSON.stringify(beforeEntries.get(key)) !== JSON.stringify(afterEntries.get(key))) {
      changedFields.push(key)
    }
  }

  return changedFields
}
