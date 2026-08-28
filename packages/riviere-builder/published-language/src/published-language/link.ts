import type { Link as PublishedLink } from '@living-architecture/riviere-schema-published-language/schema'
import { LinkId } from '@living-architecture/riviere-schema-published-language/link-id'

type NewLink = Readonly<{
  from: PublishedLink['source']
  to: PublishedLink['target']
  type?: PublishedLink['type']
  relationshipType?: PublishedLink['relationshipType']
  condition?: PublishedLink['condition']
  sourceLocation?: PublishedLink['sourceLocation']
}>

/** @riviere-role value-object */
export class Link {
  declare private readonly brand: 'Link'

  private constructor(private readonly value: PublishedLink) {}

  static parse(value: PublishedLink): Link {
    return new Link(value)
  }

  static parseNew(input: NewLink): Link {
    const value: PublishedLink = {
      id: LinkId.parseFromLink({
        source: input.from,
        target: input.to,
        ...(input.sourceLocation === undefined ? {} : { sourceLocation: input.sourceLocation }),
      }).toString(),
      source: input.from,
      target: input.to,
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.relationshipType === undefined ? {} : { relationshipType: input.relationshipType }),
      ...(input.condition === undefined ? {} : { condition: input.condition }),
      ...(input.sourceLocation === undefined ? {} : { sourceLocation: input.sourceLocation }),
    }
    return new Link(value)
  }

  storedIdentity(): string {
    return LinkId.parseFromGraphLink(this.value).toString()
  }

  occurrenceIdentity(): string {
    return LinkId.parseFromLink(this.value).toString()
  }

  published(): PublishedLink {
    return this.value
  }
}
