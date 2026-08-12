import type { HttpLinkConfig } from '@living-architecture/riviere-extract-config'
import type { ExternalLink, ExternalTarget } from '@living-architecture/riviere-schema'
import type { EnrichedComponent } from '../value-extraction/enriched-component'
import { componentIdentity } from './call-graph/component-identity'
import { ConnectionDetectionError } from './connection-detection-error'
import { ExtractedLink } from './extracted-link'
import { HttpLinkResolutionResult } from './http-link-resolution-result'

/** @riviere-role domain-service */
export function resolveHttpLinks(
  links: readonly ExtractedLink[],
  components: readonly EnrichedComponent[],
  httpLinkConfigs: readonly HttpLinkConfig[],
): HttpLinkResolutionResult {
  if (httpLinkConfigs.length === 0) {
    return HttpLinkResolutionResult.parse({
      links: [...links],
      externalLinks: [],
    })
  }

  const resolvedCustomTypes = new Set(httpLinkConfigs.map((config) => config.fromCustomType))
  const componentsByIdentity = indexComponentsByIdentity(components)

  const resolvedLinks: ExtractedLink[] = []
  const externalLinks: ExternalLink[] = []

  for (const link of links) {
    const targetComponent = componentsByIdentity.get(link.target)
    if (targetComponent === undefined || !resolvedCustomTypes.has(targetComponent.type)) {
      resolvedLinks.push(link)
      continue
    }

    const config = httpLinkConfigs.find((c) => c.fromCustomType === targetComponent.type)
    /* istanbul ignore next -- @preserve: defensive guard; resolvedCustomTypes.has guarantees config exists */
    if (config === undefined) {
      resolvedLinks.push(link)
      continue
    }

    const domainName = readStringMetadata(targetComponent, config.matchDomainBy)
    if (domainName === undefined) {
      resolvedLinks.push(link)
      continue
    }

    const matchedApi = findApiComponentInDomain(
      components,
      domainName,
      targetComponent,
      config.matchApiBy,
    )

    if (matchedApi === undefined) {
      externalLinks.push(toExternalLink(link, domainName, targetComponent, config.matchApiBy))
      continue
    }

    resolvedLinks.push(
      ExtractedLink.parse({
        source: link.source,
        target: componentIdentity(matchedApi),
        ...(link.type !== undefined && { type: link.type }),
        ...(link._uncertain !== undefined && { _uncertain: link._uncertain }),
        ...(link.sourceLocation !== undefined && { sourceLocation: link.sourceLocation }),
      }),
    )
  }

  return HttpLinkResolutionResult.parse({
    links: resolvedLinks,
    externalLinks,
  })
}

/** @riviere-role domain-service */
export function stripResolvedCustomTypes(
  components: readonly EnrichedComponent[],
  httpLinkConfigs: readonly HttpLinkConfig[],
  resolvedLinks: readonly ExtractedLink[],
): EnrichedComponent[] {
  const resolvedCustomTypes = new Set(httpLinkConfigs.map((config) => config.fromCustomType))
  const targetedIdentities = new Set(resolvedLinks.map((link) => link.target))
  return components.filter((component) => {
    if (!resolvedCustomTypes.has(component.type)) {
      return true
    }
    return targetedIdentities.has(componentIdentity(component))
  })
}

function indexComponentsByIdentity(
  components: readonly EnrichedComponent[],
): ReadonlyMap<string, EnrichedComponent> {
  const byIdentity = new Map<string, EnrichedComponent>()
  for (const component of components) {
    byIdentity.set(componentIdentity(component), component)
  }
  return byIdentity
}

function readStringMetadata(component: EnrichedComponent, key: string): string | undefined {
  const value = component.metadata[key]
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }
  return undefined
}

function findApiComponentInDomain(
  components: readonly EnrichedComponent[],
  domainName: string,
  targetComponent: EnrichedComponent,
  matchApiBy: readonly string[],
): EnrichedComponent | undefined {
  const domainApis = components.filter((c) => c.type === 'api' && c.domain === domainName)

  const matched = domainApis.filter((api) =>
    matchApiBy.every((key) => {
      const targetValue = targetComponent.metadata[key]
      if (targetValue === undefined) {
        return false
      }
      const apiValue = api.metadata[key]
      if (apiValue === undefined) {
        return true
      }
      return targetValue === apiValue
    }),
  )

  if (matched.length === 1) {
    return matched[0]
  }

  if (matched.length > 1) {
    const matchedNames = matched.map((c) => c.name).join(', ')
    throw new ConnectionDetectionError({
      file: targetComponent.location.file,
      line: targetComponent.location.line,
      typeName: targetComponent.name,
      reason: `Ambiguous HTTP link: ${matched.length} API components in domain "${domainName}" match: ${matchedNames}`,
    })
  }

  return undefined
}

function buildExternalTarget(
  serviceName: string,
  targetComponent: EnrichedComponent,
  matchApiBy: readonly string[],
): ExternalTarget {
  const target: ExternalTarget = { name: serviceName }
  for (const key of matchApiBy) {
    const value = readStringMetadata(targetComponent, key)
    if (value !== undefined) {
      target[key] = value
    }
  }
  return target
}

function toExternalLink(
  link: ExtractedLink,
  serviceName: string,
  targetComponent: EnrichedComponent,
  matchApiBy: readonly string[],
): ExternalLink {
  return {
    source: link.source,
    target: buildExternalTarget(serviceName, targetComponent, matchApiBy),
    ...(link.type !== undefined && { type: link.type }),
    ...(link.sourceLocation !== undefined && { sourceLocation: link.sourceLocation }),
  }
}
