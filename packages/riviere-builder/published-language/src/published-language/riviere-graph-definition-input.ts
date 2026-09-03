import type {
  CustomPropertyDefinition,
  DomainMetadata,
  SourceInfo,
  SystemType,
} from '@living-architecture/riviere-schema-published-language/schema'

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
export type BuilderOptions = Readonly<{
  name?: string
  description?: string
  sources: readonly SourceInfo[]
  domains: Readonly<Record<string, DomainMetadata>>
}>
