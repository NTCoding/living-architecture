import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import {
  compareArchitectureText,
  renderArchitectureChangeCount,
} from './architecture-review-markdown'
import { renderArchitecturePrimary } from './architecture-review-primary-item'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type LayerChanges = Diff['subdomains'][number]['layers']['entrypoints']
type ArchitectureItem = LayerChanges['added']['items'][number]
type Relationship = NonNullable<ArchitectureItem['relatedTo']>[number]

type ArchitecturePrimaryChangeCounts = {
  readonly added: number
  readonly removed: number
}

/** @riviere-role cli-output-formatter */
export function renderArchitectureEntrypoints(changes: LayerChanges): readonly string[] {
  return renderPrimarySection('Entry points', changes, isEntrypoint)
}

/** @riviere-role cli-output-formatter */
export function renderArchitectureUseCaseCategory(
  label: 'Command use cases' | 'Query use cases',
  primaryRole: 'command-use-case' | 'query-model-use-case',
  changes: LayerChanges,
): readonly string[] {
  return renderPrimarySection(
    label,
    changes,
    (relationship: Relationship): boolean => relationship.role === primaryRole,
  )
}

/** @riviere-role cli-output-formatter */
export function architectureEntrypointChangeCounts(
  changes: LayerChanges,
): ArchitecturePrimaryChangeCounts {
  return primaryChangeCounts(changes, isEntrypoint)
}

/** @riviere-role cli-output-formatter */
export function architectureUseCaseChangeCounts(
  changes: LayerChanges,
  primaryRole: 'command-use-case' | 'query-model-use-case',
): ArchitecturePrimaryChangeCounts {
  return primaryChangeCounts(
    changes,
    (relationship: Relationship): boolean => relationship.role === primaryRole,
  )
}

/** @riviere-role cli-output-formatter */
export function hasVisibleEntrypointChanges(changes: LayerChanges): boolean {
  const counts = architectureEntrypointChangeCounts(changes)
  return counts.added > 0 || counts.removed > 0
}

function renderPrimarySection(
  label: 'Entry points' | 'Command use cases' | 'Query use cases',
  changes: LayerChanges,
  isSelectedPrimary: (relationship: Relationship) => boolean,
): readonly string[] {
  const addedItems = visibleItems(changes.added.items)
  const removedItems = visibleItems(changes.removed.items)
  const added = primaryRelationships(addedItems).filter(isSelectedPrimary)
  const removed = primaryRelationships(removedItems).filter(isSelectedPrimary)
  if (added.length === 0 && removed.length === 0) return []
  const showChangeHeadings = added.length > 0 && removed.length > 0
  return [
    `### ${label} (${renderArchitectureChangeCount(added.length, removed.length)})`,
    '',
    ...renderPrimaryChangeSet('Added', added, addedItems, showChangeHeadings),
    ...renderPrimaryChangeSet('Removed', removed, removedItems, showChangeHeadings),
  ]
}

function renderPrimaryChangeSet(
  heading: 'Added' | 'Removed',
  primaries: readonly Relationship[],
  items: readonly ArchitectureItem[],
  showHeading: boolean,
): readonly string[] {
  if (primaries.length === 0) return []
  return [
    ...(showHeading ? [`#### ${heading}`, ''] : []),
    ...primaries.flatMap((primary) => renderArchitecturePrimary(primary, items)),
  ]
}

function primaryChangeCounts(
  changes: LayerChanges,
  isSelectedPrimary: (relationship: Relationship) => boolean,
): ArchitecturePrimaryChangeCounts {
  return {
    added: primaryRelationships(visibleItems(changes.added.items)).filter(isSelectedPrimary).length,
    removed: primaryRelationships(visibleItems(changes.removed.items)).filter(isSelectedPrimary)
      .length,
  }
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

function isPrimaryRole(role: string): boolean {
  return role.endsWith('-entrypoint') || isUseCaseRole(role)
}

function isEntrypoint(relationship: Relationship): boolean {
  return relationship.role.endsWith('-entrypoint')
}

function visibleItems(items: readonly ArchitectureItem[]): readonly ArchitectureItem[] {
  return items.filter((item) => !item.role.endsWith('-entrypoint-dependencies'))
}

function isUseCaseRole(role: string): boolean {
  return role === 'command-use-case' || role === 'query-model-use-case'
}

function relationshipKey(relationship: Relationship): string {
  return `${relationship.role}:${relationship.name}`
}
