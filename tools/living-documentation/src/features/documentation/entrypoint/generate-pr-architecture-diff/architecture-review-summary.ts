import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import { compareArchitectureText, renderArchitectureCodeSpan } from './architecture-review-markdown'
import {
  architectureEntrypointChangeCounts,
  architectureUseCaseChangeCounts,
} from './architecture-review-primary-sections'
import { architectureUncategorisedChangeCounts } from './architecture-review-role-sections'
import { architectureExternalClientChangeSummaries } from './architecture-review-external-client-section'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type SubdomainChanges = Diff['subdomains'][number]
type ChangeDirection = 'added' | 'removed'
type ArchitectureItem = SubdomainChanges['layers']['use-cases']['added']['items'][number]

/** @riviere-role cli-output-formatter */
export function renderArchitectureSummary(
  subdomains: readonly SubdomainChanges[],
): readonly string[] {
  return [
    '## Summary',
    '',
    '| Subdomain | Status | Added | Removed |',
    '| --- | --- | --- | --- |',
    ...subdomains.map(renderSubdomainSummary),
    '',
  ]
}

function renderSubdomainSummary(subdomain: SubdomainChanges): string {
  const name = renderArchitectureCodeSpan(subdomain.name, true)
  const status = subdomain.change === 'added' ? '🆕' : 'Changed'
  return `| 🌍 **${name}** | ${status} | ${renderSummaryCell(subdomain, 'added')} | ${renderSummaryCell(subdomain, 'removed')} |`
}

function renderSummaryCell(subdomain: SubdomainChanges, direction: ChangeDirection): string {
  const entrypoints = architectureEntrypointChangeCounts(subdomain.layers.entrypoints)[direction]
  const commands = architectureUseCaseChangeCounts(
    subdomain.layers['use-cases'],
    'command-use-case',
  )[direction]
  const queries = architectureUseCaseChangeCounts(
    subdomain.layers['use-cases'],
    'query-model-use-case',
  )[direction]
  const domain = subdomain.layers.domain[direction]
  const descriptions = [
    ...countDescription(entrypoints, 'entry point'),
    ...countDescription(commands, 'command use case'),
    ...countDescription(queries, 'query use case'),
    ...queryModelDescriptions(subdomain, direction),
    ...countDescription(domain.aggregates.length, 'aggregate'),
    ...countDescription(domain.items.length, 'domain item'),
    ...externalClientDescriptions(subdomain, direction),
    ...uncategorisedDescriptions(subdomain, direction),
  ]
  return descriptions.length === 0 ? '—' : descriptions.join(' · ')
}

function queryModelDescriptions(
  subdomain: SubdomainChanges,
  direction: ChangeDirection,
): readonly string[] {
  const items = ungroupedUseCaseItems(subdomain.layers['use-cases'][direction].items).filter(
    (item) => item.externalClient === undefined && isQueryModelRole(item.role),
  )
  const roles = [...new Set(items.map((item) => item.role))].sort(compareArchitectureText)
  return roles.flatMap((role) =>
    countDescription(
      items.filter((item) => item.role === role).length,
      role === 'query-model' ? 'query model' : 'query model value',
    ),
  )
}

function externalClientDescriptions(
  subdomain: SubdomainChanges,
  direction: ChangeDirection,
): readonly string[] {
  return architectureExternalClientChangeSummaries(subdomain.layers['use-cases']).flatMap(
    (client) => {
      const count = client[direction]
      if (count === 0) return []
      const oppositeDirection = direction === 'added' ? 'removed' : 'added'
      const name = renderArchitectureCodeSpan(client.name, true)
      return client[oppositeDirection] === 0
        ? [`${name} external client with ${count} ${plural(count, 'component')}`]
        : [`${count} ${name} external client ${plural(count, 'component')}`]
    },
  )
}

function uncategorisedDescriptions(
  subdomain: SubdomainChanges,
  direction: ChangeDirection,
): readonly string[] {
  const count = architectureUncategorisedChangeCounts(subdomain.layers['use-cases'])[direction]
  return countDescription(count, 'uncategorised change')
}

function ungroupedUseCaseItems(items: readonly ArchitectureItem[]): readonly ArchitectureItem[] {
  return items.filter(
    (item) =>
      !isUseCaseRole(item.role) &&
      !(item.relatedTo ?? []).some((relationship) => isUseCaseRole(relationship.role)),
  )
}

function isQueryModelRole(role: string): boolean {
  return role === 'query-model' || role === 'query-model-value'
}

function isUseCaseRole(role: string): boolean {
  return role === 'command-use-case' || role === 'query-model-use-case'
}

function countDescription(count: number, singular: string): readonly string[] {
  return count === 0 ? [] : [`${count} ${plural(count, singular)}`]
}

function plural(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`
}
