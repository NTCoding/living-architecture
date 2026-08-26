import type { FindTarget } from './extraction-config-schema'
import type { ExtractionRule } from './extraction-rule'
import type { Predicate } from './predicate'

/** @riviere-role published-language-data-structure */
export interface ExtractBlock {
  readonly [fieldName: string]: ExtractionRule
}

/** @riviere-role published-language-data-structure */
export interface DetectionRule {
  readonly kind: 'detection'
  readonly find: FindTarget
  readonly where: Predicate
  readonly extract?: ExtractBlock
}

/** @riviere-role published-language-data-structure */
export interface UnusedComponentRule {
  readonly kind: 'notUsed'
}

/** @riviere-role published-language-union */
export type ComponentRule = UnusedComponentRule | DetectionRule

/** @riviere-role published-language-data-structure */
export interface CustomTypes {
  readonly [customTypeName: string]: DetectionRule
}
