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
    ...changes.subdomains.map((subdomain) => renderSubdomainSummary(subdomain.name)),
    '',
    ...changes.subdomains.flatMap(renderSubdomain),
  ].join('\n')
}

function renderSubdomainSummary(name: string): string {
  const renderedName = renderCodeSpan(name)
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)
    ? `- [${renderedName}](#subdomain-${name})`
    : `- ${renderedName}`
}

function renderSubdomain(subdomain: SubdomainArchitectureChanges): readonly string[] {
  return [
    `## Subdomain: ${renderCodeSpan(subdomain.name)}`,
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
    `##### Aggregate: ${renderCodeSpan(aggregate.name)} (${renderCodeSpan(aggregate.packageKind)})`,
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
    : [`- ${label}`, ...members.map((member) => `    - ${renderCodeSpan(member)}`)]
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
  return renderCodeSpan(value, true)
}

function renderCodeSpan(value: string, escapePipes = false): string {
  const normalized = value.replaceAll('\r', ' ').replaceAll('\n', ' ')
  const singleLine = escapePipes
    ? normalized.replaceAll('\\', '\\\\').replaceAll('|', '\\|')
    : normalized
  const delimiter = '`'.repeat(longestBacktickRun(singleLine) + 1)
  const padding = singleLine.includes('`') ? ' ' : ''
  return `${delimiter}${padding}${singleLine}${padding}${delimiter}`
}

function longestBacktickRun(value: string): number {
  return Math.max(0, ...[...value.matchAll(/`+/g)].map((match) => match[0].length))
}
