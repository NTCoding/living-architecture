import type { ExternalLink } from '@living-architecture/riviere-schema'
import type { EnrichedComponent } from '../value-extraction/enrich-components'
import type { ExtractedLink } from './extracted-link'
import { componentIdentity } from './call-graph/call-graph-types'
import { ConnectionDetectionError } from './connection-detection-error'

/** @riviere-role value-object */
export interface HttpCallRewriteResult {
  links: ExtractedLink[]
  externalLinks: ExternalLink[]
}

function mapComponentsByIdentity(
  components: readonly EnrichedComponent[],
): ReadonlyMap<string, EnrichedComponent> {
  const byIdentity = new Map<string, EnrichedComponent>()
  for (const component of components) {
    byIdentity.set(componentIdentity(component), component)
  }
  return byIdentity
}

function parseServiceName(httpCallComponent: EnrichedComponent): string {
  const rawServiceName = httpCallComponent.metadata['serviceName']
  if (typeof rawServiceName === 'string' && rawServiceName.trim().length > 0) {
    return rawServiceName
  }

  throw new ConnectionDetectionError({
    file: httpCallComponent.location.file,
    line: httpCallComponent.location.line,
    typeName: componentIdentity(httpCallComponent),
    reason: `Expected metadata.serviceName to be a non-empty string, got ${JSON.stringify(rawServiceName)}`,
  })
}

function toExternalLink(link: ExtractedLink, serviceName: string): ExternalLink {
  return {
    source: link.source,
    target: { name: serviceName },
    ...(link.type === undefined ? {} : { type: link.type }),
    ...(link.sourceLocation === undefined ? {} : { sourceLocation: link.sourceLocation }),
  }
}

/** @riviere-role domain-service */
export function rewriteHttpCallLinks(
  links: readonly ExtractedLink[],
  components: readonly EnrichedComponent[],
): HttpCallRewriteResult {
  const linksToKeep: ExtractedLink[] = []
  const externalLinks: ExternalLink[] = []
  const componentsByIdentity = mapComponentsByIdentity(components)

  for (const link of links) {
    const targetComponent = componentsByIdentity.get(link.target)
    if (targetComponent?.type !== 'httpCall') {
      linksToKeep.push(link)
      continue
    }

    const serviceName = parseServiceName(targetComponent)
    externalLinks.push(toExternalLink(link, serviceName))
  }

  return {
    links: linksToKeep,
    externalLinks,
  }
}

/** @riviere-role domain-service */
export function stripHttpCallComponents(
  components: readonly EnrichedComponent[],
): EnrichedComponent[] {
  return components.filter((component) => component.type !== 'httpCall')
}
