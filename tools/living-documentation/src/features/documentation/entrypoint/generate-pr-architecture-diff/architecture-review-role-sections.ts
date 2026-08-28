import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import { compareArchitectureText, renderArchitectureCodeSpan } from './architecture-review-markdown'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type SubdomainChanges = Diff['subdomains'][number]
type LayerChanges = SubdomainChanges['layers']['domain']
type ChangeSet = LayerChanges['added']
type ArchitectureItem = ChangeSet['items'][number]
type ExternalClientItem = ArchitectureItem & { readonly externalClient: string }

/** @riviere-role cli-output-formatter */
export function renderArchitectureExternalClients(changes: LayerChanges): readonly string[] {
  const added = externalClientItems(changes.added.items)
  const removed = externalClientItems(changes.removed.items)
  const clients = uniqueText([
    ...added.map((item) => item.externalClient),
    ...removed.map((item) => item.externalClient),
  ])
  if (clients.length === 0) return []
  return [
    '### External clients',
    '',
    ...clients.flatMap((client) => [
      `#### Client: ${renderArchitectureCodeSpan(client)}`,
      '',
      ...renderRoleChangeSet('Added', itemsForClient(added, client), 5),
      ...renderRoleChangeSet('Removed', itemsForClient(removed, client), 5),
    ]),
  ]
}

/** @riviere-role cli-output-formatter */
export function renderArchitectureQueryModels(changes: LayerChanges): readonly string[] {
  return renderRoleSection('Query models', changes, queryModelItems)
}

/** @riviere-role cli-output-formatter */
export function renderUncategorisedArchitectureChanges(changes: LayerChanges): readonly string[] {
  return renderRoleSection('Uncategorised changes', changes, uncategorisedItems)
}

function renderRoleSection(
  label: 'Query models' | 'Uncategorised changes',
  changes: LayerChanges,
  selectItems: (items: readonly ArchitectureItem[]) => readonly ArchitectureItem[],
): readonly string[] {
  const added = selectItems(changes.added.items)
  const removed = selectItems(changes.removed.items)
  if (added.length === 0 && removed.length === 0) return []
  return [
    `### ${label}`,
    '',
    ...renderRoleChangeSet('Added', added, 4),
    ...renderRoleChangeSet('Removed', removed, 4),
  ]
}

function renderRoleChangeSet(
  heading: 'Added' | 'Removed',
  items: readonly ArchitectureItem[],
  headingLevel: 4 | 5,
): readonly string[] {
  if (items.length === 0) return []
  const roles = [...new Set(items.map((item) => item.role))].sort(compareArchitectureText)
  return [
    `${'#'.repeat(headingLevel)} ${heading}`,
    '',
    ...roles.flatMap((role) => [
      `${'#'.repeat(headingLevel + 1)} ${roleLabel(role)}`,
      '',
      ...items
        .filter((item) => item.role === role)
        .map((item) => `- ${renderArchitectureCodeSpan(item.name)}`),
      '',
    ]),
  ]
}

function ungroupedUseCaseItems(items: readonly ArchitectureItem[]): readonly ArchitectureItem[] {
  return items.filter(
    (item) =>
      !isUseCaseRole(item.role) &&
      !(item.relatedTo ?? []).some((relationship) => isUseCaseRole(relationship.role)),
  )
}

function externalClientItems(items: readonly ArchitectureItem[]): readonly ExternalClientItem[] {
  return ungroupedUseCaseItems(items).filter(hasExternalClient)
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

function itemsForClient(
  items: readonly ExternalClientItem[],
  client: string,
): readonly ExternalClientItem[] {
  return items.filter((item) => item.externalClient === client)
}

function hasExternalClient(item: ArchitectureItem): item is ExternalClientItem {
  return item.externalClient !== undefined
}

function isQueryModelRole(role: string): boolean {
  return role === 'query-model' || role === 'query-model-value'
}

function uniqueText(items: readonly string[]): readonly string[] {
  return [...new Set(items)].sort(compareArchitectureText)
}

function isUseCaseRole(role: string): boolean {
  return role === 'command-use-case' || role === 'query-model-use-case'
}

function roleLabel(role: string): string {
  return role
    .split('-')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ')
}
