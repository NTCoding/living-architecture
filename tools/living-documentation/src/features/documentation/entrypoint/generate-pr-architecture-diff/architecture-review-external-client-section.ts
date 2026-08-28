import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import {
  compareArchitectureText,
  renderArchitectureChangeCount,
  renderArchitectureChangedNounCount,
  renderArchitectureCodeSpan,
  renderArchitectureHtmlText,
} from './architecture-review-markdown'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type LayerChanges = Diff['subdomains'][number]['layers']['domain']
type ArchitectureItem = LayerChanges['added']['items'][number]
type ExternalClientItem = ArchitectureItem & { readonly externalClient: string }

type ArchitectureExternalClientChangeSummary = {
  readonly added: number
  readonly name: string
  readonly removed: number
}

/** @riviere-role cli-output-formatter */
export function renderArchitectureExternalClients(changes: LayerChanges): readonly string[] {
  const added = externalClientItems(changes.added.items)
  const removed = externalClientItems(changes.removed.items)
  const clients = architectureExternalClientChangeSummaries(changes)
  if (clients.length === 0) return []
  return [
    `### External clients (${renderClientStatusCount(clients)})`,
    '',
    ...clients.flatMap((client) => renderExternalClient(client, added, removed)),
  ]
}

/** @riviere-role cli-output-formatter */
export function architectureExternalClientChangeSummaries(
  changes: LayerChanges,
): readonly ArchitectureExternalClientChangeSummary[] {
  const added = externalClientItems(changes.added.items)
  const removed = externalClientItems(changes.removed.items)
  return uniqueText([
    ...added.map((item) => item.externalClient),
    ...removed.map((item) => item.externalClient),
  ]).map((name) => ({
    added: itemsForClient(added, name).length,
    name,
    removed: itemsForClient(removed, name).length,
  }))
}

function renderExternalClient(
  client: ArchitectureExternalClientChangeSummary,
  added: readonly ExternalClientItem[],
  removed: readonly ExternalClientItem[],
): readonly string[] {
  const addedItems = itemsForClient(added, client.name)
  const removedItems = itemsForClient(removed, client.name)
  const roles = uniqueText([
    ...addedItems.map((item) => item.role),
    ...removedItems.map((item) => item.role),
  ])
  return [
    '<details>',
    `<summary>${renderArchitectureHtmlText(client.name)} — ${renderArchitectureChangedNounCount(client.added, client.removed, 'component')}</summary>`,
    '',
    ...roles.flatMap((role) =>
      renderExternalClientRole(
        role,
        addedItems.filter((item) => item.role === role),
        removedItems.filter((item) => item.role === role),
      ),
    ),
    '</details>',
    '',
  ]
}

function renderExternalClientRole(
  role: string,
  added: readonly ExternalClientItem[],
  removed: readonly ExternalClientItem[],
): readonly string[] {
  const showChangeHeadings = added.length > 0 && removed.length > 0
  return [
    '<details>',
    `<summary>${renderArchitectureHtmlText(role)} — ${renderArchitectureChangeCount(added.length, removed.length)}</summary>`,
    '',
    ...renderItems('Added', added, showChangeHeadings),
    ...renderItems('Removed', removed, showChangeHeadings),
    '</details>',
    '',
  ]
}

function renderItems(
  heading: 'Added' | 'Removed',
  items: readonly ExternalClientItem[],
  showHeading: boolean,
): readonly string[] {
  if (items.length === 0) return []
  return [
    ...(showHeading ? [`##### ${heading}`, ''] : []),
    ...items.map((item) => `- ${renderArchitectureCodeSpan(item.name)}`),
    '',
  ]
}

function externalClientItems(items: readonly ArchitectureItem[]): readonly ExternalClientItem[] {
  return items.filter(isUngroupedUseCaseItem).filter(hasExternalClient)
}

function isUngroupedUseCaseItem(item: ArchitectureItem): boolean {
  return (
    !isUseCaseRole(item.role) &&
    !(item.relatedTo ?? []).some((relationship) => isUseCaseRole(relationship.role))
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

function uniqueText(items: readonly string[]): readonly string[] {
  return [...new Set(items)].sort(compareArchitectureText)
}

function isUseCaseRole(role: string): boolean {
  return role === 'command-use-case' || role === 'query-model-use-case'
}

function renderClientStatusCount(
  clients: readonly ArchitectureExternalClientChangeSummary[],
): string {
  const added = clients.filter((client) => client.added > 0 && client.removed === 0).length
  const removed = clients.filter((client) => client.added === 0 && client.removed > 0).length
  const changed = clients.length - added - removed
  return [
    ...(added === 0 ? [] : [`${added} added`]),
    ...(changed === 0 ? [] : [`${changed} changed`]),
    ...(removed === 0 ? [] : [`${removed} removed`]),
  ].join(', ')
}
