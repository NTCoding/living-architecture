import type {
  Link,
  RiviereGraph,
} from '@living-architecture/riviere-schema-published-language/schema'
import {
  ArchitectureDiffPrototypeError,
  architectureLayerNames,
  type ArchitectureAggregate,
  type ArchitectureItem,
  type ArchitectureLayerName,
  type ArchitecturePackageKind,
  type ArchitectureSnapshot,
  type GraphArchitectureElement,
  type IndexedGraphArchitectureElement,
} from './riviere-architecture-graph-types'

export function architectureSnapshotToRiviereGraph(
  snapshot: ArchitectureSnapshot,
  repository: string,
  commit: string,
): RiviereGraph {
  const indexedElements = snapshot.subdomains.flatMap((subdomain) =>
    architectureLayerNames.flatMap((layer) => {
      const architectureLayer = subdomain.layers[layer]
      const aggregates = architectureLayer.aggregates.flatMap((aggregate, aggregateIndex) =>
        aggregateElements(subdomain.name, layer, aggregate, aggregateIndex, repository),
      )
      const items = architectureLayer.items.map((item, itemIndex) => ({
        component: architectureItemComponent(
          subdomain.name,
          layer,
          item,
          `item-${itemIndex}`,
          repository,
        ),
        layer,
      }))
      return [...aggregates, ...items]
    }),
  )
  return {
    version: '1.0',
    metadata: {
      name: `${repository} architecture review facts`,
      sources: [{ commit, repository }],
      domains: Object.fromEntries(
        snapshot.subdomains.map((subdomain) => [
          subdomain.name,
          { description: `${subdomain.name} architecture`, systemType: 'domain' },
        ]),
      ),
      customTypes: {
        'architecture-review-element': {
          requiredProperties: {
            architectureRole: { type: 'string' },
            packageKind: { type: 'string' },
          },
          optionalProperties: {
            aggregateOwnerId: { type: 'string' },
            externalClient: { type: 'string' },
            methods: { type: 'array' },
          },
        },
      },
      relationshipTypes: {
        'aggregate-owns-entity': { description: 'Aggregate ownership of an entity' },
        'supports-primary-element': {
          description: 'Supporting architecture element association with its primary element',
        },
      },
    },
    components: indexedElements.map(({ component }) => component),
    links: [...architectureLinks(snapshot, indexedElements)],
  }
}

function aggregateElements(
  subdomain: string,
  layer: ArchitectureLayerName,
  aggregate: ArchitectureAggregate,
  aggregateIndex: number,
  repository: string,
): readonly IndexedGraphArchitectureElement[] {
  const aggregateComponent = architectureElementComponent({
    architectureRole: 'aggregate',
    discriminator: `aggregate-${aggregateIndex}`,
    layer,
    methods: aggregate.methods,
    name: aggregate.name,
    packageKind: aggregate.packageKind,
    repository,
    subdomain,
  })
  const entities = aggregate.entities.map((entity, entityIndex) => ({
    component: {
      ...architectureItemComponent(
        subdomain,
        layer,
        entity,
        `aggregate-${aggregateIndex}-entity-${entityIndex}`,
        repository,
      ),
      aggregateOwnerId: aggregateComponent.id,
    },
    layer,
  }))
  return [{ component: aggregateComponent, layer }, ...entities]
}

function architectureItemComponent(
  subdomain: string,
  layer: ArchitectureLayerName,
  item: ArchitectureItem,
  discriminator: string,
  repository: string,
): GraphArchitectureElement {
  return architectureElementComponent({
    architectureRole: item.role,
    discriminator,
    ...(item.externalClient === undefined ? {} : { externalClient: item.externalClient }),
    layer,
    name: item.name,
    packageKind: item.packageKind,
    repository,
    subdomain,
  })
}

function architectureElementComponent(input: {
  readonly architectureRole: string
  readonly discriminator: string
  readonly externalClient?: string
  readonly layer: ArchitectureLayerName
  readonly methods?: readonly string[]
  readonly name: string
  readonly packageKind: ArchitecturePackageKind
  readonly repository: string
  readonly subdomain: string
}): GraphArchitectureElement {
  return {
    id: componentId(input),
    type: 'Custom',
    customTypeName: 'architecture-review-element',
    name: input.name,
    domain: input.subdomain,
    module: input.layer,
    sourceLocation: {
      repository: input.repository,
      filePath: `${input.subdomain}/${input.layer}/${input.discriminator}`,
    },
    architectureRole: input.architectureRole,
    packageKind: input.packageKind,
    ...(input.externalClient === undefined ? {} : { externalClient: input.externalClient }),
    ...(input.methods === undefined ? {} : { methods: input.methods }),
  }
}

function componentId(input: {
  readonly architectureRole: string
  readonly discriminator: string
  readonly layer: ArchitectureLayerName
  readonly name: string
  readonly subdomain: string
}): string {
  return [input.subdomain, input.layer, input.architectureRole, input.name, input.discriminator]
    .map(encodeURIComponent)
    .join(':')
}

function architectureLinks(
  snapshot: ArchitectureSnapshot,
  indexedElements: readonly IndexedGraphArchitectureElement[],
): readonly Link[] {
  const ownershipLinks = indexedElements.flatMap(({ component }) =>
    component.architectureRole === 'aggregate'
      ? aggregateOwnershipLinks(component, indexedElements)
      : [],
  )
  const supportLinks = snapshot.subdomains.flatMap((subdomain) =>
    architectureLayerNames.flatMap((layer) =>
      subdomain.layers[layer].items.flatMap((item, itemIndex) =>
        supportLinksForItem(subdomain.name, layer, item, itemIndex, indexedElements),
      ),
    ),
  )
  return [...ownershipLinks, ...supportLinks]
}

function aggregateOwnershipLinks(
  aggregate: GraphArchitectureElement,
  indexedElements: readonly IndexedGraphArchitectureElement[],
): readonly Link[] {
  return indexedElements
    .filter(({ component }) => component.aggregateOwnerId === aggregate.id)
    .map(({ component }) => ({
      source: aggregate.id,
      target: component.id,
      relationshipType: 'aggregate-owns-entity',
    }))
}

function supportLinksForItem(
  subdomain: string,
  layer: ArchitectureLayerName,
  item: ArchitectureItem,
  itemIndex: number,
  indexedElements: readonly IndexedGraphArchitectureElement[],
): readonly Link[] {
  const sourceId = componentId({
    architectureRole: item.role,
    discriminator: `item-${itemIndex}`,
    layer,
    name: item.name,
    subdomain,
  })
  const source = requiredElementById(
    indexedElements.map(({ component }) => component),
    sourceId,
  )
  return (item.relatedTo ?? []).map((relationship) => ({
    source: source.id,
    target: findElement(indexedElements, subdomain, layer, relationship.role, relationship.name)
      .component.id,
    relationshipType: 'supports-primary-element',
  }))
}

function findElement(
  indexedElements: readonly IndexedGraphArchitectureElement[],
  subdomain: string,
  layer: ArchitectureLayerName,
  role: string,
  name: string,
): IndexedGraphArchitectureElement {
  const matching = indexedElements.filter(
    (element) =>
      element.component.domain === subdomain &&
      element.layer === layer &&
      element.component.architectureRole === role &&
      element.component.name === name,
  )
  if (matching.length !== 1 || matching[0] === undefined) {
    throw new ArchitectureDiffPrototypeError(
      `Expected one graph element for ${subdomain}/${layer}/${role}/${name}. Got ${matching.length}.`,
    )
  }
  return matching[0]
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
