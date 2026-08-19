import type {
  ExternalLink,
  Link,
} from '@living-architecture/riviere-schema-published-language/schema'
import { LinkId } from '@living-architecture/riviere-schema-published-language/link-id'
import type { BuilderGraph } from '../builder-graph'
import { createComponentNotFoundError } from '../construction/builder-internals'
import {
  DuplicateLinkError,
  RelationshipTypeNotFoundError,
} from '../construction/construction-errors'

type LinkInput = Readonly<{
  from: Link['source']
  to: Link['target']
  type?: Link['type']
  relationshipType?: Link['relationshipType']
  condition?: Link['condition']
  sourceLocation?: Link['sourceLocation']
}>

type ExternalLinkInput = Readonly<{
  from: ExternalLink['source']
  target: ExternalLink['target']
  type?: ExternalLink['type']
  description?: ExternalLink['description']
  sourceLocation?: ExternalLink['sourceLocation']
}>

type AddDuplicateLinkWarning = (
  warning: Readonly<{
    code: 'DUPLICATE_LINK_SKIPPED'
    message: string
    source: string
    target: string
    linkType?: string
    targetRepository?: string
    targetName: string
  }>,
) => void

/** @riviere-role domain-service */
export class GraphLinking {
  private graph: BuilderGraph
  private readonly addWarning: AddDuplicateLinkWarning
  private readonly updateGraph: (graph: BuilderGraph) => void

  constructor(
    graph: BuilderGraph,
    addWarning: AddDuplicateLinkWarning,
    updateGraph: (graph: BuilderGraph) => void,
  ) {
    this.graph = graph
    this.addWarning = addWarning
    this.updateGraph = updateGraph
  }

  link(input: LinkInput): Link {
    if (!this.graph.hasComponent(input.from)) {
      throw createComponentNotFoundError(this.graph.components, input.from)
    }

    if (
      input.relationshipType !== undefined &&
      !Object.hasOwn(this.graph.metadata.relationshipTypes, input.relationshipType)
    ) {
      throw new RelationshipTypeNotFoundError(
        input.relationshipType,
        Object.keys(this.graph.metadata.relationshipTypes),
      )
    }

    const id = LinkId.parseFromLink({
      source: input.from,
      target: input.to,
      ...(input.sourceLocation !== undefined && { sourceLocation: input.sourceLocation }),
    }).toString()
    if (this.graph.hasLink(id) || this.graph.hasLinkByParsedId(id)) {
      throw new DuplicateLinkError(id)
    }

    const link: Link = {
      id,
      source: input.from,
      target: input.to,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.relationshipType !== undefined && { relationshipType: input.relationshipType }),
      ...(input.condition !== undefined && { condition: input.condition }),
      ...(input.sourceLocation !== undefined && { sourceLocation: input.sourceLocation }),
    }
    this.graph.withLink(link)
    this.updateGraph(this.graph)
    return link
  }

  linkExternal(input: ExternalLinkInput): ExternalLink {
    if (!this.graph.hasComponent(input.from)) {
      throw createComponentNotFoundError(this.graph.components, input.from)
    }

    const externalLink: ExternalLink = {
      source: input.from,
      target: input.target,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.sourceLocation !== undefined && { sourceLocation: input.sourceLocation }),
    }

    const duplicate = this.graph.findExternalLink(externalLink)

    if (duplicate) {
      this.addWarning({
        code: 'DUPLICATE_LINK_SKIPPED',
        message: `Duplicate external link '${input.from}' -> '${input.target.name}' (${input.type ?? 'unspecified'}) skipped`,
        source: input.from,
        target: input.target.name,
        ...(input.type !== undefined && { linkType: input.type }),
        ...(input.target.repository !== undefined && { targetRepository: input.target.repository }),
        targetName: input.target.name,
      })

      return duplicate
    }

    this.graph.withExternalLink(externalLink)
    this.updateGraph(this.graph)
    return externalLink
  }
}
