import type * as GraphTypes from '../graph-types'

const PARALLEL_LABEL_GAP = 16

function relationshipLabelKey(link: GraphTypes.SimulationLink): string {
  return JSON.stringify([
    link.originalEdge.source,
    link.originalEdge.target,
    link.originalEdge.relationshipType,
  ])
}

export function getUniqueRelationshipLabelLinks(
  links: GraphTypes.SimulationLink[],
): GraphTypes.SimulationLink[] {
  const seenKeys = new Set<string>()
  return links.filter((link) => {
    if (link.originalEdge.relationshipType === undefined) return false

    const key = relationshipLabelKey(link)
    if (seenKeys.has(key)) return false

    seenKeys.add(key)
    return true
  })
}

export function getRelationshipLabelDetails(
  links: GraphTypes.SimulationLink[],
  labelLink: GraphTypes.SimulationLink,
  formatDetail: (link: GraphTypes.SimulationLink) => string,
): string {
  const labelKey = relationshipLabelKey(labelLink)
  return [
    ...new Set(
      links
        .filter((link) => relationshipLabelKey(link) === labelKey)
        .map((link) => formatDetail(link)),
    ),
  ].join('\n')
}

export function getUnorderedNodePairKey(link: GraphTypes.SimulationLink): string {
  const source = link.originalEdge.source
  const target = link.originalEdge.target
  return JSON.stringify(source < target ? [source, target] : [target, source])
}

export function getVerticalLabelOffsets(
  links: GraphTypes.SimulationLink[],
  getGroupKey: (link: GraphTypes.SimulationLink) => string,
): Map<GraphTypes.SimulationLink, number> {
  const groupedLinks = new Map<string, GraphTypes.SimulationLink[]>()
  for (const link of links) {
    const key = getGroupKey(link)
    const group = groupedLinks.get(key)
    if (group === undefined) groupedLinks.set(key, [link])
    else group.push(link)
  }

  const offsets = new Map<GraphTypes.SimulationLink, number>()
  for (const group of groupedLinks.values()) {
    group.forEach((link, index) => {
      offsets.set(link, (index - (group.length - 1) / 2) * PARALLEL_LABEL_GAP)
    })
  }
  return offsets
}
