import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import { compareArchitectureText, renderArchitectureCodeSpan } from './architecture-review-markdown'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type LayerChanges = Diff['subdomains'][number]['layers']['entrypoints']
type ArchitectureItem = LayerChanges['added']['items'][number]
type Relationship = NonNullable<ArchitectureItem['relatedTo']>[number]

/** @riviere-role cli-output-formatter */
export function renderArchitectureEntrypoints(changes: LayerChanges): readonly string[] {
  if (!hasVisibleEntrypointChanges(changes)) return []
  return [
    '### Entry points',
    '',
    ...renderPrimaryChangeSet('Added', changes.added.items, isEntrypoint),
    ...renderPrimaryChangeSet('Removed', changes.removed.items, isEntrypoint),
  ]
}

/** @riviere-role cli-output-formatter */
export function renderArchitectureUseCaseCategory(
  label: 'Command use cases' | 'Query use cases',
  primaryRole: 'command-use-case' | 'query-model-use-case',
  changes: LayerChanges,
): readonly string[] {
  const selected = (relationship: Relationship): boolean => relationship.role === primaryRole
  if (!hasPrimaryChanges(changes, selected)) return []
  return [
    `### ${label}`,
    '',
    ...renderPrimaryChangeSet('Added', changes.added.items, selected),
    ...renderPrimaryChangeSet('Removed', changes.removed.items, selected),
  ]
}

/** @riviere-role cli-output-formatter */
export function hasVisibleEntrypointChanges(changes: LayerChanges): boolean {
  return [changes.added, changes.removed].some((changeSet) =>
    changeSet.items.some((item) => !isEntrypointDependencies(item)),
  )
}

function renderPrimaryChangeSet(
  heading: 'Added' | 'Removed',
  items: readonly ArchitectureItem[],
  isSelectedPrimary: (relationship: Relationship) => boolean,
): readonly string[] {
  const visibleItems = items.filter((item) => !isEntrypointDependencies(item))
  const primaries = primaryRelationships(visibleItems).filter(isSelectedPrimary)
  return primaries.length === 0
    ? []
    : [
        `#### ${heading}`,
        '',
        ...primaries.flatMap((primary) => renderPrimary(primary, visibleItems)),
      ]
}

function renderPrimary(
  primary: Relationship,
  items: readonly ArchitectureItem[],
): readonly string[] {
  const related = items.filter((item) =>
    (item.relatedTo ?? []).some((relationship) => sameRelationship(relationship, primary)),
  )
  return [
    `##### ${renderArchitectureCodeSpan(primary.name)}`,
    '',
    `- Role: ${renderArchitectureCodeSpan(primary.role)}`,
    ...related.map(
      (item) =>
        `- ${relatedRoleLabel(item.role)}: ${renderArchitectureCodeSpan(item.name)} (${renderArchitectureCodeSpan(item.role)})`,
    ),
    '',
  ]
}

function primaryRelationships(items: readonly ArchitectureItem[]): readonly Relationship[] {
  const relationships = items.flatMap((item): readonly Relationship[] => [
    ...(isPrimaryRole(item.role) ? [{ name: item.name, role: item.role }] : []),
    ...(item.relatedTo ?? []).filter((relationship) => isPrimaryRole(relationship.role)),
  ])
  const unique = new Map(
    relationships.map((relationship) => [relationshipKey(relationship), relationship]),
  )
  return [...unique.values()].sort((left, right) =>
    compareArchitectureText(relationshipKey(left), relationshipKey(right)),
  )
}

function hasPrimaryChanges(
  changes: LayerChanges,
  isSelectedPrimary: (relationship: Relationship) => boolean,
): boolean {
  return [changes.added, changes.removed].some((changeSet) =>
    primaryRelationships(changeSet.items).some(isSelectedPrimary),
  )
}

function isPrimaryRole(role: string): boolean {
  return role.endsWith('-entrypoint') || isUseCaseRole(role)
}

function isEntrypoint(relationship: Relationship): boolean {
  return relationship.role.endsWith('-entrypoint')
}

function isEntrypointDependencies(item: ArchitectureItem): boolean {
  return item.role.endsWith('-entrypoint-dependencies')
}

function isUseCaseRole(role: string): boolean {
  return role === 'command-use-case' || role === 'query-model-use-case'
}

function sameRelationship(left: Relationship, right: Relationship): boolean {
  return relationshipKey(left) === relationshipKey(right)
}

function relationshipKey(relationship: Relationship): string {
  return `${relationship.role}:${relationship.name}`
}

function relatedRoleLabel(role: string): string {
  const labels: Readonly<Record<string, string>> = {
    'cli-output-formatter': 'Output formatter',
    'cli-response-writer': 'Response writer',
    'command-use-case-input': 'Input',
    'query-model': 'Output model',
    'query-model-loader': 'Loader',
    'query-model-use-case-input': 'Input',
  }
  return labels[role] ?? 'Related component'
}
