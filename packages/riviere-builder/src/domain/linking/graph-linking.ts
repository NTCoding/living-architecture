import type {
  ExternalLink, Link 
} from '@living-architecture/riviere-schema'
import type { BuilderGraph } from '../builder-graph'
import type {
  ExternalLinkInput, LinkInput 
} from './linking-types'
import { createComponentNotFoundError } from '../../builder-internals'

export class GraphLinking {
  private readonly graph: BuilderGraph

  constructor(graph: BuilderGraph) {
    this.graph = graph
  }

  link(input: LinkInput): Link {
    const sourceExists = this.graph.components.some((c) => c.id === input.from)
    if (!sourceExists) {
      throw createComponentNotFoundError(this.graph.components, input.from)
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
