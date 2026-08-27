import type { ArchitectureLayerName } from './architecture-review-types'
import {
  hasChangeSetChanges,
  hasLayerChanges,
  type AggregateChanges,
  type ArchitectureChangeSet,
  type ArchitectureLayerChanges,
  type PullRequestArchitectureChanges,
  type SubdomainArchitectureChanges,
} from './architecture-review-diff'

const COMMENT_MARKER = '<!-- pull-request-architecture-review -->'
const layerLabels: Readonly<Record<ArchitectureLayerName, string>> = {
  domain: 'Domain',
  entrypoints: 'Entry points',
  'use-cases': 'Use cases',
}
const layerNames: readonly ArchitectureLayerName[] = ['entrypoints', 'use-cases', 'domain']

export function renderArchitectureReview(changes: PullRequestArchitectureChanges): string {
  if (changes.subdomains.length === 0) {
    return [
      COMMENT_MARKER,
      '# Pull request architecture changes',
      '',
      'No architecture changes detected.',
      '',
    ].join('\n')
  }
  return [
    COMMENT_MARKER,
    '# Pull request architecture changes',
    '',
    '## Changed subdomains',
    '',
    ...changes.subdomains.map(
      (subdomain) => `- [\`${subdomain.name}\`](#subdomain-${subdomain.name})`,
    ),
    '',
    ...changes.subdomains.flatMap(renderSubdomain),
  ].join('\n')
}

function renderSubdomain(subdomain: SubdomainArchitectureChanges): readonly string[] {
  return [
    `## Subdomain: \`${subdomain.name}\``,
    '',
    ...layerNames.flatMap((layer) => renderLayer(layer, subdomain.layers[layer])),
  ]
}

function renderLayer(
  layer: ArchitectureLayerName,
  changes: ArchitectureLayerChanges,
): readonly string[] {
  if (!hasLayerChanges(changes)) return []
  return [
    `### ${layerLabels[layer]}`,
    '',
    ...renderChangeSet('Added', layer, changes.added),
    ...renderChangeSet('Removed', layer, changes.removed),
  ]
}

function renderChangeSet(
  heading: 'Added' | 'Removed',
  layer: ArchitectureLayerName,
  changes: ArchitectureChangeSet,
): readonly string[] {
  if (!hasChangeSetChanges(changes)) return []
  return [
    `#### ${heading}`,
    '',
    ...changes.aggregates.flatMap(renderAggregate),
    ...renderItems(layer, changes.items),
  ]
}

function renderAggregate(aggregate: AggregateChanges): readonly string[] {
  return [
    `##### Aggregate: \`${aggregate.name}\``,
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
    : [`- ${label}`, ...members.map((member) => `    - \`${member}\``)]
}

function renderItems(
  layer: ArchitectureLayerName,
  items: ArchitectureChangeSet['items'],
): readonly string[] {
  if (items.length === 0) return []
  const includePackage = layer === 'domain'
  return [
    includePackage ? '| Name | Role | Package |' : '| Name | Role |',
    includePackage ? '| --- | --- | --- |' : '| --- | --- |',
    ...items.map((item) =>
      includePackage
        ? `| ${renderTableCode(item.name)} | ${renderTableCode(item.role)} | ${renderTableCode(item.packageKind)} |`
        : `| ${renderTableCode(item.name)} | ${renderTableCode(item.role)} |`,
    ),
    '',
  ]
}

function renderTableCode(value: string): string {
  const escaped = value
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ')
    .replaceAll('|', '&#124;')
    .replaceAll('`', '&#96;')
  return `\`${escaped}\``
}
