import type {
  Component,
  ExternalLink,
  Link,
} from '@living-architecture/riviere-schema-published-language/schema'
import type { OperationWarning } from './graph-diagnostics'

/** @riviere-role published-language-data-structure */
export type UpsertResult<T extends Component = Component> = Readonly<{
  component: T
  created: boolean
  warnings: readonly OperationWarning[]
}>

/** @riviere-role published-language-data-structure */
export type UpsertLinkResult = Readonly<{
  link: Link
  created: boolean
}>

/** @riviere-role published-language-data-structure */
export type LinkExternalResult = Readonly<{
  link: ExternalLink
  warnings: readonly OperationWarning[]
}>
