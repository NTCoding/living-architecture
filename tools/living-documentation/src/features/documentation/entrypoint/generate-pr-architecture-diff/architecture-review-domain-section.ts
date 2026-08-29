import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import {
  renderArchitectureChangeCount,
  renderArchitectureCodeSpan,
  renderArchitectureHtmlText,
} from './architecture-review-markdown'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type LayerChanges = Diff['subdomains'][number]['layers']['domain']
type ChangeSet = LayerChanges['added']
type ArchitectureItem = ChangeSet['items'][number]
type AggregateChanges = ChangeSet['aggregates'][number]

type ArchitectureDomainChangeCounts = {
  readonly added: number
  readonly removed: number
}

/** @riviere-role cli-output-formatter */
export function renderArchitectureDomain(changes: LayerChanges): readonly string[] {
  const counts = architectureDomainChangeCounts(changes)
  if (counts.added === 0 && counts.removed === 0) return []
  const showChangeHeadings = counts.added > 0 && counts.removed > 0
  return [
    `### Domain (${renderArchitectureChangeCount(counts.added, counts.removed)})`,
    '',
    ...renderDomainChangeSet('Added', changes.added, showChangeHeadings),
    ...renderDomainChangeSet('Removed', changes.removed, showChangeHeadings),
  ]
}

function architectureDomainChangeCounts(changes: LayerChanges): ArchitectureDomainChangeCounts {
  return {
    added: changeSetCount(changes.added),
    removed: changeSetCount(changes.removed),
  }
}

/** @riviere-role cli-output-formatter */
export function hasArchitectureLayerChanges(changes: LayerChanges): boolean {
  const counts = architectureDomainChangeCounts(changes)
  return counts.added > 0 || counts.removed > 0
}

function renderDomainChangeSet(
  heading: 'Added' | 'Removed',
  changes: ChangeSet,
  showHeading: boolean,
): readonly string[] {
  if (changeSetCount(changes) === 0) return []
  return [
    ...(showHeading ? [`#### ${heading}`, ''] : []),
    ...changes.aggregates.flatMap(renderAggregate),
    ...changes.items.map(renderDomainItem),
    '',
  ]
}

function renderAggregate(aggregate: AggregateChanges): readonly string[] {
  return [
    `- <span>${renderArchitectureHtmlText(aggregate.name)}</span> (aggregate, ${renderArchitectureCodeSpan(aggregate.packageKind)})`,
    ...renderAggregateMembers(
      'Aggregate entities',
      aggregate.entities.map((entity) => entity.name),
    ),
    ...renderAggregateMembers('Methods', aggregate.methods),
  ]
}

function renderAggregateMembers(
  label: 'Aggregate entities' | 'Methods',
  members: readonly string[],
): readonly string[] {
  return members.length === 0
    ? []
    : [
        `    - ${label}`,
        ...members.map((member) => `        - ${renderArchitectureCodeSpan(member)}`),
      ]
}

function renderDomainItem(item: ArchitectureItem): string {
  return `- <span>${renderArchitectureHtmlText(item.name)}</span> (${renderArchitectureHtmlText(item.role)})`
}

function changeSetCount(changes: ChangeSet): number {
  return changes.aggregates.length + changes.items.length
}
