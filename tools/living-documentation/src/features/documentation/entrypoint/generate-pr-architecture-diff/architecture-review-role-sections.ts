import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import {
  renderArchitectureChangeCount,
  renderArchitectureHtmlText,
} from './architecture-review-markdown'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type LayerChanges = Diff['subdomains'][number]['layers']['domain']
type ArchitectureItem = LayerChanges['added']['items'][number]

type ArchitectureRoleChangeCounts = {
  readonly added: number
  readonly removed: number
}

/** @riviere-role cli-output-formatter */
export function renderArchitectureQueryModels(changes: LayerChanges): readonly string[] {
  return renderRoleSection('Query models', changes, queryModelItems, omitQueryModelRole)
}

/** @riviere-role cli-output-formatter */
export function renderUncategorisedArchitectureChanges(changes: LayerChanges): readonly string[] {
  return renderRoleSection('Uncategorised changes', changes, uncategorisedItems, neverOmitRole)
}

/** @riviere-role cli-output-formatter */
export function architectureUncategorisedChangeCounts(
  changes: LayerChanges,
): ArchitectureRoleChangeCounts {
  return roleChangeCounts(changes, uncategorisedItems)
}

function renderRoleSection(
  label: 'Query models' | 'Uncategorised changes',
  changes: LayerChanges,
  selectItems: (items: readonly ArchitectureItem[]) => readonly ArchitectureItem[],
  omitRole: (role: string) => boolean,
): readonly string[] {
  const added = selectItems(changes.added.items)
  const removed = selectItems(changes.removed.items)
  if (added.length === 0 && removed.length === 0) return []
  const showChangeHeadings = added.length > 0 && removed.length > 0
  return [
    `### ${label} (${renderArchitectureChangeCount(added.length, removed.length)})`,
    '',
    ...renderRoleItems('Added', added, showChangeHeadings, omitRole),
    ...renderRoleItems('Removed', removed, showChangeHeadings, omitRole),
  ]
}

function renderRoleItems(
  heading: 'Added' | 'Removed',
  items: readonly ArchitectureItem[],
  showHeading: boolean,
  omitRole: (role: string) => boolean,
): readonly string[] {
  if (items.length === 0) return []
  return [
    ...(showHeading ? [`#### ${heading}`, ''] : []),
    ...items.map((item) => renderRoleItem(item, omitRole)),
    '',
  ]
}

function renderRoleItem(item: ArchitectureItem, omitRole: (role: string) => boolean): string {
  const name = `<span>${renderArchitectureHtmlText(item.name)}</span>`
  return omitRole(item.role) ? `- ${name}` : `- ${name} (${renderArchitectureHtmlText(item.role)})`
}

function roleChangeCounts(
  changes: LayerChanges,
  selectItems: (items: readonly ArchitectureItem[]) => readonly ArchitectureItem[],
): ArchitectureRoleChangeCounts {
  return {
    added: selectItems(changes.added.items).length,
    removed: selectItems(changes.removed.items).length,
  }
}

function ungroupedUseCaseItems(items: readonly ArchitectureItem[]): readonly ArchitectureItem[] {
  return items.filter(
    (item) =>
      !isUseCaseRole(item.role) &&
      !(item.relatedTo ?? []).some((relationship) => isUseCaseRole(relationship.role)),
  )
}

function queryModelItems(items: readonly ArchitectureItem[]): readonly ArchitectureItem[] {
  return ungroupedUseCaseItems(items).filter(
    (item) => item.externalClient === undefined && isQueryModelRole(item.role),
  )
}

function uncategorisedItems(items: readonly ArchitectureItem[]): readonly ArchitectureItem[] {
  return ungroupedUseCaseItems(items).filter(
    (item) => item.externalClient === undefined && !isQueryModelRole(item.role),
  )
}

function isQueryModelRole(role: string): boolean {
  return role === 'query-model' || role === 'query-model-value'
}

function isUseCaseRole(role: string): boolean {
  return role === 'command-use-case' || role === 'query-model-use-case'
}

function omitQueryModelRole(role: string): boolean {
  return role === 'query-model'
}

function neverOmitRole(): boolean {
  return false
}
