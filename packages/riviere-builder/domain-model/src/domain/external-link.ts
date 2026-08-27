import type { ExternalLink as PublishedExternalLink } from '@living-architecture/riviere-schema-published-language/schema'

type NewExternalLink = Readonly<{
  from: PublishedExternalLink['source']
  target: PublishedExternalLink['target']
  type?: PublishedExternalLink['type']
  description?: PublishedExternalLink['description']
  sourceLocation?: PublishedExternalLink['sourceLocation']
  metadata?: Readonly<Record<string, unknown>>
}>

/** @riviere-role value-object */
export class ExternalLink {
  declare private readonly brand: 'ExternalLink'

  private constructor(private readonly value: PublishedExternalLink) {}

  static parse(value: PublishedExternalLink): ExternalLink {
    return new ExternalLink(value)
  }

  static parseNew(input: NewExternalLink): ExternalLink {
    return new ExternalLink({
      source: input.from,
      target: input.target,
      ...(input.type === undefined ? {} : { type: input.type }),
      ...(input.description === undefined ? {} : { description: input.description }),
      ...(input.sourceLocation === undefined ? {} : { sourceLocation: input.sourceLocation }),
    })
  }

  connectionIdentity(): string {
    return JSON.stringify([
      this.value.source,
      this.value.target.name,
      this.value.target.repository,
      this.value.type,
    ])
  }

  published(): PublishedExternalLink {
    return this.value
  }
}
