import type {
  Component,
  ComponentType,
  RiviereGraph,
} from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role published-language-data-structure */
export interface OrphanComponentWarning {
  readonly code: 'ORPHAN_COMPONENT'
  readonly message: string
  readonly componentId: string
}

/** @riviere-role published-language-data-structure */
export interface UnusedDomainWarning {
  readonly code: 'UNUSED_DOMAIN'
  readonly message: string
  readonly domainName: string
}

/** @riviere-role published-language-union */
export type GraphWarning = OrphanComponentWarning | UnusedDomainWarning

/** @riviere-role published-language-data-structure */
export interface ScalarOverwriteWarning {
  readonly code: 'SCALAR_OVERWRITE'
  readonly message: string
  readonly componentId: string
  readonly field: string
  readonly oldValue: string | number | boolean
  readonly newValue: string | number | boolean
}

/** @riviere-role published-language-data-structure */
export interface DuplicateLinkWarning {
  readonly code: 'DUPLICATE_LINK_SKIPPED'
  readonly message: string
  readonly source: string
  readonly target: string
  readonly linkType?: string
  readonly targetRepository?: string
  readonly targetName: string
}

/** @riviere-role published-language-union */
export type OperationWarning = ScalarOverwriteWarning | DuplicateLinkWarning

/** @riviere-role published-language-data-structure */
export interface NearMatchQuery {
  readonly name: string
  readonly type?: ComponentType
  readonly domain?: string
}

/** @riviere-role published-language-data-structure */
export interface NearMatchOptions {
  readonly threshold?: number
  readonly limit?: number
}

/** @riviere-role published-language-data-structure */
export interface NearMatchMismatch {
  readonly field: 'type' | 'domain'
  readonly expected: string
  readonly actual: string
}

/** @riviere-role published-language-data-structure */
export interface NearMatchResult {
  readonly component: Component
  readonly score: number
  readonly mismatch?: NearMatchMismatch
}

/** @riviere-role value-object */
export class GraphDiagnostics {
  declare private readonly brand: 'GraphDiagnostics'

  private constructor(private readonly graph: RiviereGraph) {}

  static fromGraph(graph: RiviereGraph): GraphDiagnostics {
    return new GraphDiagnostics(graph)
  }

  orphanComponents(): readonly Component[] {
    const connectedIds = new Set<string>()

    for (const link of this.graph.links) {
      connectedIds.add(link.source)
      connectedIds.add(link.target)
    }

    for (const externalLink of this.graph.externalLinks ?? []) {
      connectedIds.add(externalLink.source)
    }

    return this.graph.components.filter((component) => !connectedIds.has(component.id))
  }

  warnings(): readonly GraphWarning[] {
    const orphanWarnings: OrphanComponentWarning[] = this.orphanComponents().map((component) => ({
      code: 'ORPHAN_COMPONENT',
      message: `Component '${component.id}' has no incoming or outgoing links`,
      componentId: component.id,
    }))

    const usedDomains = new Set(this.graph.components.map((component) => component.domain))
    const unusedDomainWarnings: UnusedDomainWarning[] = Object.keys(this.graph.metadata.domains)
      .filter((domain) => !usedDomains.has(domain))
      .map((domain) => ({
        code: 'UNUSED_DOMAIN',
        message: `Domain '${domain}' is declared but has no components`,
        domainName: domain,
      }))

    return [...orphanWarnings, ...unusedDomainWarnings]
  }

  nearMatches(query: NearMatchQuery, options?: NearMatchOptions): readonly NearMatchResult[] {
    if (query.name === '') return []

    const threshold = options?.threshold ?? 0.6
    const limit = options?.limit ?? 10

    return this.graph.components
      .map((component): NearMatchResult => {
        const score = normalisedNameSimilarity(query.name, component.name)
        const mismatch = mismatchBetween(query, component)
        return {
          component,
          score,
          ...(mismatch === undefined ? {} : { mismatch }),
        }
      })
      .filter((result) => result.score >= threshold || result.mismatch !== undefined)
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
  }
}

function editDistance(expected: string, actual: string): number {
  const initialRow = Array.from({ length: actual.length + 1 }, (_, index) => index)
  const finalRow = [...expected].reduce((previousRow, expectedCharacter, expectedIndex) => {
    const nextRow = previousRow.slice(1).reduce(
      (state, above, actualIndex) => {
        const substitutionCost = expectedCharacter === actual.charAt(actualIndex) ? 0 : 1
        const value = Math.min(state.left + 1, above + 1, state.diagonal + substitutionCost)
        state.values.push(value)
        return { values: state.values, left: value, diagonal: above }
      },
      {
        values: [expectedIndex + 1],
        left: expectedIndex + 1,
        diagonal: expectedIndex,
      },
    )
    return nextRow.values
  }, initialRow)

  return finalRow.reduce((_previous, current) => current, 0)
}

function normalisedNameSimilarity(expected: string, actual: string): number {
  const normalisedExpected = expected.toLowerCase()
  const normalisedActual = actual.toLowerCase()
  const distance = editDistance(normalisedExpected, normalisedActual)
  const longestNameLength = Math.max(normalisedExpected.length, normalisedActual.length)

  return 1 - distance / longestNameLength
}

function mismatchBetween(
  query: NearMatchQuery,
  component: Component,
): NearMatchMismatch | undefined {
  if (query.name.toLowerCase() !== component.name.toLowerCase()) return undefined

  if (query.type !== undefined && query.type !== component.type) {
    return { field: 'type', expected: query.type, actual: component.type }
  }

  if (query.domain !== undefined && query.domain !== component.domain) {
    return { field: 'domain', expected: query.domain, actual: component.domain }
  }

  return undefined
}
