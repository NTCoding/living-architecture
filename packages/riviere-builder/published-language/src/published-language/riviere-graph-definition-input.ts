import type {
  CustomPropertyDefinition,
  DomainMetadata,
  RiviereGraph,
  SourceInfo,
  SystemType,
} from '@living-architecture/riviere-schema-published-language/schema'
import { InvalidGraphError } from './construction-errors'

/** @riviere-role published-language-data-structure */
export type DomainInput = Readonly<{
  name: string
  description: string
  systemType: SystemType
}>

/** @riviere-role published-language-data-structure */
export type CustomTypeInput = Readonly<{
  name: string
  description?: string
  requiredProperties?: Readonly<Record<string, CustomPropertyDefinition>>
  optionalProperties?: Readonly<Record<string, CustomPropertyDefinition>>
}>

/** @riviere-role published-language-data-structure */
export type RelationshipTypeInput = Readonly<{
  name: string
  description: string
}>

/** @riviere-role published-language-data-structure */
export type BuilderOptionsInput = {
  readonly name?: string | undefined
  readonly description?: string | undefined
  readonly sources: readonly SourceInfo[]
  readonly domains: Readonly<Record<string, DomainMetadata>>
}

/** @riviere-role value-object */
export class BuilderOptions {
  declare private readonly brand: 'BuilderOptions'

  private constructor(
    readonly sources: readonly SourceInfo[],
    readonly domains: Readonly<Record<string, DomainMetadata>>,
    readonly name?: string,
    readonly description?: string,
  ) {}

  static parse(input: BuilderOptionsInput): BuilderOptions {
    return new BuilderOptions(
      [...input.sources],
      { ...input.domains },
      input.name,
      input.description,
    )
  }

  static fromGraph(graph: RiviereGraph): BuilderOptions {
    const sources = graph.metadata.sources
    if (sources === undefined || sources.length === 0) {
      throw new InvalidGraphError('missing sources')
    }
    return new BuilderOptions(
      [...sources],
      { ...graph.metadata.domains },
      graph.metadata.name,
      graph.metadata.description,
    )
  }

  toJSON(): BuilderOptionsInput {
    return {
      sources: this.sources,
      domains: this.domains,
      ...(this.name === undefined ? {} : { name: this.name }),
      ...(this.description === undefined ? {} : { description: this.description }),
    }
  }
}
