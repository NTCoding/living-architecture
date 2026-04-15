import type {
  ExternalLink, Link 
} from '@living-architecture/riviere-schema'
import type { BuilderGraph } from '../builder-graph'
import type { BuilderWarning } from '../inspection/inspection-types'
import type {
  ExternalLinkInput, LinkInput 
} from './linking-types'
import { createComponentNotFoundError } from '../construction/builder-internals'

/** @riviere-role domain-service */
export class GraphLinking {
  private readonly graph: BuilderGraph
  private readonly operationWarnings: BuilderWarning[]

  constructor(graph: BuilderGraph, operationWarnings: BuilderWarning[]) {
    this.graph = graph
    this.operationWarnings = operationWarnings
  }

  link(input: LinkInput): Link {
    const sourceExists = this.graph.components.some((c) => c.id === input.from)
    if (!sourceExists) {
      throw createComponentNotFoundError(this.graph.components, input.from)
    }

    const duplicate = this.graph.links.find(
      (link) => link.source === input.from && link.target === input.to && link.type === input.type,
    )

    if (duplicate) {
      this.operationWarnings.push({
        code: 'DUPLICATE_LINK_SKIPPED',
        message: `Duplicate link '${input.from}' -> '${input.to}' (${input.type ?? 'unspecified'}) skipped`,
        source: input.from,
        target: input.to,
        ...(input.type !== undefined && { linkType: input.type }),
      })

      return duplicate
    }

    const link: Link = {
      source: input.from,
      target: input.to,
      ...(input.type !== undefined && { type: input.type }),
    }
    this.graph.links.push(link)
    return link
  }

  linkExternal(input: ExternalLinkInput): ExternalLink {
    const sourceExists = this.graph.components.some((c) => c.id === input.from)
    if (!sourceExists) {
      throw createComponentNotFoundError(this.graph.components, input.from)
    }

    const duplicate = this.graph.externalLinks.find(
      (link) =>
        link.source === input.from &&
        link.target.repository === input.target.repository &&
        link.target.name === input.target.name &&
        link.type === input.type,
    )

    if (duplicate) {
      this.operationWarnings.push({
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

    const externalLink: ExternalLink = {
      source: input.from,
      target: input.target,
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.sourceLocation !== undefined && { sourceLocation: input.sourceLocation }),
    }
    this.graph.externalLinks.push(externalLink)
    return externalLink
  }
}
