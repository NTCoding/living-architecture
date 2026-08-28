import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import { renderArchitectureCodeSpan } from './architecture-review-markdown'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type LayerChanges = Diff['subdomains'][number]['layers']['domain']
type ChangeSet = LayerChanges['added']
type ArchitectureItem = ChangeSet['items'][number]
type AggregateChanges = ChangeSet['aggregates'][number]

/** @riviere-role cli-output-formatter */
export function renderArchitectureDomain(changes: LayerChanges): readonly string[] {
  if (!hasArchitectureLayerChanges(changes)) return []
  return [
    '### Domain',
    '',
    ...renderDomainChangeSet('Added', changes.added),
    ...renderDomainChangeSet('Removed', changes.removed),
  ]
}

/** @riviere-role cli-output-formatter */
export function hasArchitectureLayerChanges(changes: LayerChanges): boolean {
  return hasChangeSetChanges(changes.added) || hasChangeSetChanges(changes.removed)
}

function renderDomainChangeSet(
  heading: 'Added' | 'Removed',
  changes: ChangeSet,
): readonly string[] {
  if (!hasChangeSetChanges(changes)) return []
  return [
    `#### ${heading}`,
    '',
    ...changes.aggregates.flatMap(renderAggregate),
    ...renderDomainItems(changes.items),
  ]
}

function renderAggregate(aggregate: AggregateChanges): readonly string[] {
  return [
    `##### Aggregate: ${renderArchitectureCodeSpan(aggregate.name)} (${renderArchitectureCodeSpan(aggregate.packageKind)})`,
    '',
    ...renderAggregateMembers(
      'Aggregate entities',
      aggregate.entities.map((entity) => entity.name),
    ),
    ...renderAggregateMembers('Methods', aggregate.methods),
    '',
  ]
}

function renderAggregateMembers(
  label: 'Aggregate entities' | 'Methods',
  members: readonly string[],
): readonly string[] {
  return members.length === 0
    ? []
    : [`- ${label}`, ...members.map((member) => `    - ${renderArchitectureCodeSpan(member)}`)]
}

function renderDomainItems(items: readonly ArchitectureItem[]): readonly string[] {
  if (items.length === 0) return []
  return [
    '| Name | Role | Package |',
    '| --- | --- | --- |',
    ...items.map(
      (item) =>
        `| ${tableCode(item.name)} | ${tableCode(item.role)} | ${tableCode(item.packageKind)} |`,
    ),
    '',
  ]
}

function hasChangeSetChanges(changes: ChangeSet): boolean {
  return changes.aggregates.length > 0 || changes.items.length > 0
}

function tableCode(value: string): string {
  return renderArchitectureCodeSpan(value, true)
}
