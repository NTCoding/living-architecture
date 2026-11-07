import {
  ArchitectureDiff,
  ArchitectureSource,
  extractArchitecture,
} from '@living-architecture/living-documentation-domain-model/domain/architecture'
import { PullRequestArchitectureDiff } from '@living-architecture/living-documentation-use-cases/features/documentation/queries/pull-request-architecture-diff'
import type {
  CustomComponent,
  RiviereGraph,
} from '@living-architecture/riviere-schema-published-language/schema'
import { parseRiviereGraph } from '@living-architecture/riviere-schema-published-language/validation'
import { formatPullRequestArchitectureDiff } from '../../../../../tools/living-documentation/src/features/documentation/entrypoint/generate-pr-architecture-diff/pull-request-architecture-diff-formatter'
import {
  ArchitectureDiffPrototypeError,
  architectureLayerNames,
  type ArchitectureAggregate,
  type ArchitectureItem,
  type ArchitectureLayerName,
  type ArchitecturePackageKind,
  type ArchitectureSnapshot,
  type GraphArchitectureElement,
} from './riviere-architecture-graph-types'

export function architectureDiffFromSnapshots(
  base: ArchitectureSnapshot,
  head: ArchitectureSnapshot,
): string {
  const diff = ArchitectureDiff.fromArchitectures(
    extractArchitecture(ArchitectureSource.from(base)),
    extractArchitecture(ArchitectureSource.from(head)),
  )
  return formatPullRequestArchitectureDiff(
    PullRequestArchitectureDiff.fromArchitectureDiff(diff, 'architecture-diff.md'),
  )
}

export function architectureDiffFromRiviereGraphs(
  baseInput: unknown,
  headInput: unknown,
  outputPath: string,
): string {
  const diff = riviereGraphArchitectureDiff(baseInput, headInput)
  return formatPullRequestArchitectureDiff(
    PullRequestArchitectureDiff.fromArchitectureDiff(diff, outputPath),
  )
}

export function riviereGraphArchitectureDiff(
  baseInput: unknown,
  headInput: unknown,
): ArchitectureDiff {
  const baseGraph = validatedGraph(baseInput)
  const headGraph = validatedGraph(headInput)
  return ArchitectureDiff.fromArchitectures(
    extractArchitecture(ArchitectureSource.from(architectureSnapshotFromRiviereGraph(baseGraph))),
    extractArchitecture(ArchitectureSource.from(architectureSnapshotFromRiviereGraph(headGraph))),
  )
}

function validatedGraph(input: unknown): RiviereGraph {
  const parsed = parseRiviereGraph(input)
  if (!parsed.success) {
    throw new ArchitectureDiffPrototypeError(
      `Expected valid Rivière graph. Got ${parsed.issues.join('\n')}`,
    )
  }
  return parsed.graph
}

export function architectureSnapshotFromRiviereGraph(graph: RiviereGraph): ArchitectureSnapshot {
  const elements = graph.components.flatMap((component): readonly GraphArchitectureElement[] =>
    component.type === 'Custom' && component.customTypeName === 'architecture-review-element'
      ? [parseArchitectureElement(component)]
      : [],
  )
  return {
    subdomains: Object.keys(graph.metadata.domains)
      .map((name) => ({
        name,
        layers: {
          domain: graphLayerSnapshot(graph, elements, name, 'domain'),
          entrypoints: graphLayerSnapshot(graph, elements, name, 'entrypoints'),
          'use-cases': graphLayerSnapshot(graph, elements, name, 'use-cases'),
        },
      }))
      .filter((subdomain) =>
        architectureLayerNames.some((layer) => {
          const architectureLayer = subdomain.layers[layer]
          return architectureLayer.aggregates.length > 0 || architectureLayer.items.length > 0
        }),
      ),
  }
}

function parseArchitectureElement(component: CustomComponent): GraphArchitectureElement {
  const aggregateOwnerId = optionalString(component['aggregateOwnerId'], 'aggregateOwnerId')
  const architectureRole = requiredString(component['architectureRole'], 'architectureRole')
  const packageKind = parsePackageKind(component['packageKind'])
  const externalClient = optionalString(component['externalClient'], 'externalClient')
  const methods = optionalStringArray(component['methods'], 'methods')
  return {
    ...component,
    architectureRole,
    packageKind,
    ...(aggregateOwnerId === undefined ? {} : { aggregateOwnerId }),
    ...(externalClient === undefined ? {} : { externalClient }),
    ...(methods === undefined ? {} : { methods }),
  }
}

function graphLayerSnapshot(
  graph: RiviereGraph,
  elements: readonly GraphArchitectureElement[],
  subdomain: string,
  layer: ArchitectureLayerName,
): ArchitectureSnapshot['subdomains'][number]['layers'][ArchitectureLayerName] {
  const layerElements = elements.filter(
    (component) => component.domain === subdomain && component.module === layer,
  )
  const aggregates = layerElements
    .filter((component) => component.architectureRole === 'aggregate')
    .map((aggregate) => graphAggregate(graph, layerElements, aggregate))
  const ownedEntityIds = new Set(
    graph.links
      .filter((link) => link.relationshipType === 'aggregate-owns-entity')
      .map((link) => link.target),
  )
  const items = layerElements
    .filter((component) => component.architectureRole !== 'aggregate')
    .filter((component) => !ownedEntityIds.has(component.id))
    .map((component) => graphArchitectureItem(graph, layerElements, component))
  return { aggregates, items }
}

function graphAggregate(
  graph: RiviereGraph,
  layerElements: readonly GraphArchitectureElement[],
  aggregate: GraphArchitectureElement,
): ArchitectureAggregate {
  const entities = graph.links
    .filter(
      (link) => link.source === aggregate.id && link.relationshipType === 'aggregate-owns-entity',
    )
    .map((link) => requiredElementById(layerElements, link.target))
    .map((component) => graphArchitectureItem(graph, layerElements, component))
  return {
    entities,
    methods: aggregate.methods ?? [],
    name: aggregate.name,
    packageKind: aggregate.packageKind,
  }
}

function graphArchitectureItem(
  graph: RiviereGraph,
  layerElements: readonly GraphArchitectureElement[],
  component: GraphArchitectureElement,
): ArchitectureItem {
  const relatedTo = graph.links
    .filter(
      (link) =>
        link.source === component.id && link.relationshipType === 'supports-primary-element',
    )
    .map((link) => requiredElementById(layerElements, link.target))
    .map((target) => ({ name: target.name, role: target.architectureRole }))
  return {
    name: component.name,
    packageKind: component.packageKind,
    role: component.architectureRole,
    ...(component.externalClient === undefined ? {} : { externalClient: component.externalClient }),
    ...(relatedTo.length === 0 ? {} : { relatedTo }),
  }
}

function requiredElementById(
  elements: readonly GraphArchitectureElement[],
  id: string,
): GraphArchitectureElement {
  const element = elements.find((candidate) => candidate.id === id)
  if (element === undefined) {
    throw new ArchitectureDiffPrototypeError(
      `Expected graph element '${id}'. Got no matching component.`,
    )
  }
  return element
}

function parsePackageKind(value: unknown): ArchitecturePackageKind {
  if (
    value === 'application' ||
    value === 'use-cases' ||
    value === 'domain-model' ||
    value === 'published-language'
  ) {
    return value
  }
  throw new ArchitectureDiffPrototypeError(
    `Expected architecture package kind. Got ${JSON.stringify(value)}.`,
  )
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ArchitectureDiffPrototypeError(
      `Expected non-empty ${field}. Got ${JSON.stringify(value)}.`,
    )
  }
  return value
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  return requiredString(value, field)
}

function optionalStringArray(value: unknown, field: string): readonly string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new ArchitectureDiffPrototypeError(
      `Expected string array ${field}. Got ${JSON.stringify(value)}.`,
    )
  }
  return value.filter((entry) => typeof entry === 'string')
}
