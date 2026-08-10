interface RelationshipPresentation {
  relationshipType?: string
  type?: string
  condition?: string
}

export function relationshipLabel(link: RelationshipPresentation): string {
  return link.relationshipType ?? 'relationship'
}

export function relationshipDetail(link: RelationshipPresentation): string {
  const details = [relationshipLabel(link)]
  if (link.type !== undefined) details.push(link.type)
  if (link.condition !== undefined) details.push(`when ${link.condition}`)
  return details.join(' · ')
}
