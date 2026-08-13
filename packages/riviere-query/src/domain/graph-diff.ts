import type { Component, Link, RiviereGraph } from '@living-architecture/riviere-schema/schema'
import { ComponentId } from './component-id'
import { ComponentModification } from './component-modification'
import { DiffStats } from './diff-stats'
import { createLinkKey } from './link-key'

/** @riviere-role value-object */
export class GraphDiff {
  declare private readonly brand: 'GraphDiff'
  readonly components: {
    added: Component[]
    removed: Component[]
    modified: ComponentModification[]
  }
  readonly links: {
    added: Link[]
    removed: Link[]
  }
  readonly stats: DiffStats

  private constructor(input: {
    readonly components: {
      added: Component[]
      removed: Component[]
      modified: ComponentModification[]
    }
    readonly links: {
      added: Link[]
      removed: Link[]
    }
    readonly stats: DiffStats
  }) {
    this.components = input.components
    this.links = input.links
    this.stats = input.stats
  }

  static parse(input: {
    readonly components: {
      added: Component[]
      removed: Component[]
      modified: ComponentModification[]
    }
    readonly links: {
      added: Link[]
      removed: Link[]
    }
    readonly stats: DiffStats
  }): GraphDiff {
    return new GraphDiff(input)
  }
}

/** @riviere-role domain-service */
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
      modified.push(
        ComponentModification.parse({
          id: ComponentId.parse(tc.id),
          before: tc,
          after: oc,
          changedFields,
        }),
      )
    }
  }

  const thisLinkKeys = new Set(current.links.map((l) => createLinkKey(l).value))
  const otherLinkKeys = new Set(other.links.map((l) => createLinkKey(l).value))
  const linksAdded = other.links.filter((l) => !thisLinkKeys.has(createLinkKey(l).value))
  const linksRemoved = current.links.filter((l) => !otherLinkKeys.has(createLinkKey(l).value))

  return GraphDiff.parse({
    components: {
      added,
      removed,
      modified,
    },
    links: {
      added: linksAdded,
      removed: linksRemoved,
    },
    stats: DiffStats.parse({
      componentsAdded: added.length,
      componentsRemoved: removed.length,
      componentsModified: modified.length,
      linksAdded: linksAdded.length,
      linksRemoved: linksRemoved.length,
    }),
  })
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
