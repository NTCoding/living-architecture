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

function mapInternalComponentsByName(
  components: readonly EnrichedComponent[],
): ReadonlyMap<string, readonly EnrichedComponent[]> {
  const byName = new Map<string, EnrichedComponent[]>()
  for (const component of components) {
    if (component.type === 'httpCall') {
      continue
    }

    const existing = byName.get(component.name)
    if (existing === undefined) {
      byName.set(component.name, [component])
      continue
    }
    existing.push(component)
  }
  return byName
}

function findUniqueApiComponentInDomainMatchingRoute(
  components: readonly EnrichedComponent[],
  domainName: string,
  route: string | undefined,
): EnrichedComponent | undefined {
  if (route === undefined) {
    return undefined
  }

  const matchedApiComponents = components.filter(
    (component) =>
      component.type === 'api' &&
      component.domain === domainName &&
      component.metadata['route'] === route,
  )

  if (matchedApiComponents.length !== 1) {
    return undefined
  }

  return matchedApiComponents[0]
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

function parseRoute(httpCallComponent: EnrichedComponent): string | undefined {
  const rawRoute = httpCallComponent.metadata['route']
  if (rawRoute === undefined) {
    return undefined
  }

  if (typeof rawRoute === 'string' && rawRoute.trim().length > 0) {
    return rawRoute
  }

  throw new ConnectionDetectionError({
    file: httpCallComponent.location.file,
    line: httpCallComponent.location.line,
    typeName: componentIdentity(httpCallComponent),
    reason: `Expected metadata.route to be a non-empty string when provided, got ${JSON.stringify(rawRoute)}`,
  })
}

function toExternalLink(
  link: ExtractedLink,
  serviceName: string,
  route: string | undefined,
): ExternalLink {
  return {
    source: link.source,
    target: {
      name: serviceName,
      ...(route === undefined ? {} : { route }),
    },
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
  const internalComponentsByName = mapInternalComponentsByName(components)

  for (const link of links) {
    const targetComponent = componentsByIdentity.get(link.target)
    if (targetComponent?.type !== 'httpCall') {
      linksToKeep.push(link)
      continue
    }

    const serviceName = parseServiceName(targetComponent)
    const matchedInternalComponents = internalComponentsByName.get(serviceName) ?? []
    const matchedInternalCount = matchedInternalComponents.length
    if (matchedInternalCount > 1) {
      throw new ConnectionDetectionError({
        file: targetComponent.location.file,
        line: targetComponent.location.line,
        typeName: componentIdentity(targetComponent),
        reason: `Expected metadata.serviceName to match exactly one internal component name, got ${matchedInternalCount} matches for ${JSON.stringify(serviceName)}`,
      })
    }

    const [uniqueInternalTarget] = matchedInternalComponents

    if (uniqueInternalTarget !== undefined) {
      linksToKeep.push({
        ...link,
        target: componentIdentity(uniqueInternalTarget),
      })
      continue
    }

    const route = parseRoute(targetComponent)

    const uniqueApiTargetInDomain = findUniqueApiComponentInDomainMatchingRoute(
      components,
      serviceName,
      route,
    )

    if (uniqueApiTargetInDomain !== undefined) {
      linksToKeep.push({
        ...link,
        target: componentIdentity(uniqueApiTargetInDomain),
      })
      continue
    }

    externalLinks.push(toExternalLink(link, serviceName, route))
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
