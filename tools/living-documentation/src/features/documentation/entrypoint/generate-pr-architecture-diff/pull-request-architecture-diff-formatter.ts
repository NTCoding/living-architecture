import type { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import { renderArchitectureCodeSpan } from './architecture-review-markdown'
import {
  hasVisibleEntrypointChanges,
  renderArchitectureEntrypoints,
  renderArchitectureUseCaseCategory,
} from './architecture-review-primary-sections'
import {
  hasArchitectureLayerChanges,
  renderArchitectureDomain,
} from './architecture-review-domain-section'
import {
  renderArchitectureExternalClients,
  renderArchitectureQueryModels,
  renderUncategorisedArchitectureChanges,
} from './architecture-review-role-sections'

type Diff = ReturnType<PullRequestArchitectureDiff['changes']>
type PullRequestArchitectureDiffView = Pick<PullRequestArchitectureDiff, 'changes' | 'outputPath'>
type SubdomainChanges = Diff['subdomains'][number]

const COMMENT_MARKER = '<!-- pull-request-architecture-review -->'

/** @riviere-role cli-output-formatter */
export function formatPullRequestArchitectureDiff(diff: PullRequestArchitectureDiffView): string {
  const subdomains = diff.changes().subdomains.filter(hasVisibleSubdomainChanges)
  if (subdomains.length === 0) return renderNoArchitectureChanges()
  return [
    COMMENT_MARKER,
    '# Pull request architecture changes',
    '',
    '## Changed subdomains',
    '',
    ...subdomains.map(renderSubdomainSummary),
    '',
    ...subdomains.flatMap(renderSubdomain),
  ].join('\n')
}

function renderNoArchitectureChanges(): string {
  return [
    COMMENT_MARKER,
    '# Pull request architecture changes',
    '',
    'No architecture changes detected.',
    '',
  ].join('\n')
}

function renderSubdomainSummary(subdomain: SubdomainChanges): string {
  const renderedName = renderArchitectureCodeSpan(subdomain.name)
  const link = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(subdomain.name)
    ? `[${renderedName}](#subdomain-${subdomain.name})`
    : renderedName
  return subdomain.change === 'added' ? `- ${link} **NEW**` : `- ${link}`
}

function renderSubdomain(subdomain: SubdomainChanges): readonly string[] {
  return [
    `## Subdomain: ${renderArchitectureCodeSpan(subdomain.name)}`,
    '',
    ...renderArchitectureEntrypoints(subdomain.layers.entrypoints),
    ...renderArchitectureUseCaseCategory(
      'Command use cases',
      'command-use-case',
      subdomain.layers['use-cases'],
    ),
    ...renderArchitectureUseCaseCategory(
      'Query use cases',
      'query-model-use-case',
      subdomain.layers['use-cases'],
    ),
    ...renderArchitectureExternalClients(subdomain.layers['use-cases']),
    ...renderArchitectureQueryModels(subdomain.layers['use-cases']),
    ...renderUncategorisedArchitectureChanges(subdomain.layers['use-cases']),
    ...renderArchitectureDomain(subdomain.layers.domain),
  ]
}

function hasVisibleSubdomainChanges(subdomain: SubdomainChanges): boolean {
  return (
    hasVisibleEntrypointChanges(subdomain.layers.entrypoints) ||
    hasArchitectureLayerChanges(subdomain.layers['use-cases']) ||
    hasArchitectureLayerChanges(subdomain.layers.domain)
  )
}
