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

function mapInternalApiComponentsByName(
  components: readonly EnrichedComponent[],
): ReadonlyMap<string, readonly EnrichedComponent[]> {
  const byName = new Map<string, EnrichedComponent[]>()
  for (const component of components) {
    if (component.type !== 'api') {
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

function findUniqueApiComponentMatchingRoute(
  components: readonly EnrichedComponent[],
  route: string | undefined,
  method: string | undefined,
): EnrichedComponent | undefined {
  if (route === undefined) {
    return undefined
  }

  const routeMatchedApiComponents = components.filter(
    (component) => component.type === 'api' && component.metadata['route'] === route,
  )

  if (method === undefined) {
    if (routeMatchedApiComponents.length !== 1) {
      return undefined
    }

    return routeMatchedApiComponents[0]
  }

  const exactMethodMatchedApiComponents = routeMatchedApiComponents.filter(
    (component) => component.metadata['method'] === method,
  )

  if (exactMethodMatchedApiComponents.length === 1) {
    return exactMethodMatchedApiComponents[0]
  }

  if (exactMethodMatchedApiComponents.length > 1) {
    return undefined
  }

  const methodlessApiComponents = routeMatchedApiComponents.filter(
    (component) => component.metadata['method'] === undefined,
  )

  if (routeMatchedApiComponents.length !== 1 || methodlessApiComponents.length !== 1) {
    return undefined
  }

  return methodlessApiComponents[0]
}

function findUniqueApiComponentInDomainMatchingRoute(
  components: readonly EnrichedComponent[],
  domainName: string,
  route: string | undefined,
  method: string | undefined,
): EnrichedComponent | undefined {
  return findUniqueApiComponentMatchingRoute(
    components.filter((component) => component.domain === domainName),
    route,
    method,
  )
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

function parseMethod(httpCallComponent: EnrichedComponent): string | undefined {
  const rawMethod = httpCallComponent.metadata['method']
  if (rawMethod === undefined) {
    return undefined
  }

  if (typeof rawMethod === 'string' && rawMethod.trim().length > 0) {
    return rawMethod
  }

  throw new ConnectionDetectionError({
    file: httpCallComponent.location.file,
    line: httpCallComponent.location.line,
    typeName: componentIdentity(httpCallComponent),
    reason: `Expected metadata.method to be a non-empty string when provided, got ${JSON.stringify(rawMethod)}`,
  })
}

function matchesOptionalMetadata(
  expectedValue: string | undefined,
  candidateValue: unknown,
): boolean {
  if (expectedValue === undefined) {
    return true
  }

  if (candidateValue === undefined) {
    return true
  }

  return candidateValue === expectedValue
}

function canUseApiNameFallback(
  apiComponent: EnrichedComponent,
  route: string | undefined,
  method: string | undefined,
): boolean {
  return (
    matchesOptionalMetadata(route, apiComponent.metadata['route']) &&
    matchesOptionalMetadata(method, apiComponent.metadata['method']) &&
    (route === undefined || apiComponent.metadata['route'] !== undefined) &&
    (method === undefined || apiComponent.metadata['method'] !== undefined)
  )
}

function deduplicateExtractedLinks(links: readonly ExtractedLink[]): ExtractedLink[] {
  const byKey = new Map<string, ExtractedLink>()

  for (const link of links) {
    const key = JSON.stringify(link)
    if (!byKey.has(key)) {
      byKey.set(key, link)
    }
  }

  return [...byKey.values()]
}

function deduplicateExternalLinks(links: readonly ExternalLink[]): ExternalLink[] {
  const byKey = new Map<string, ExternalLink>()

  for (const link of links) {
    const key = JSON.stringify(link)
    if (!byKey.has(key)) {
      byKey.set(key, link)
    }
  }

  return [...byKey.values()]
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
  const internalApiComponentsByName = mapInternalApiComponentsByName(components)

  for (const link of links) {
    const targetComponent = componentsByIdentity.get(link.target)
    if (targetComponent?.type !== 'httpCall') {
      linksToKeep.push(link)
      continue
    }

    const serviceName = parseServiceName(targetComponent)
    const route = parseRoute(targetComponent)
    const method = parseMethod(targetComponent)

    const uniqueApiTargetInDomain = findUniqueApiComponentInDomainMatchingRoute(
      components,
      serviceName,
      route,
      method,
    )

    if (uniqueApiTargetInDomain !== undefined) {
      linksToKeep.push({
        ...link,
        target: componentIdentity(uniqueApiTargetInDomain),
      })
      continue
    }

    const matchedInternalApis = internalApiComponentsByName.get(serviceName) ?? []
    const matchedInternalApiCount = matchedInternalApis.length
    if (matchedInternalApiCount > 1) {
      externalLinks.push(toExternalLink(link, serviceName, route))
      continue
    }

    const [uniqueInternalTarget] = matchedInternalApis

    if (
      uniqueInternalTarget !== undefined &&
      canUseApiNameFallback(uniqueInternalTarget, route, method)
    ) {
      linksToKeep.push({
        ...link,
        target: componentIdentity(uniqueInternalTarget),
      })
      continue
    }

    externalLinks.push(toExternalLink(link, serviceName, route))
  }

  return {
    links: deduplicateExtractedLinks(linksToKeep),
    externalLinks: deduplicateExternalLinks(externalLinks),
  }
}

/** @riviere-role domain-service */
export function stripHttpCallComponents(
  components: readonly EnrichedComponent[],
): EnrichedComponent[] {
  return components.filter((component) => component.type !== 'httpCall')
}
