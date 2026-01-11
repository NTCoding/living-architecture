export type FindTarget = 'classes' | 'methods' | 'functions'

export type ComponentType = 'api' | 'useCase' | 'domainOp' | 'event' | 'eventHandler' | 'ui'

export interface HasDecoratorPredicate {
  hasDecorator: {
    name: string | string[]
    from?: string
  }
}

export interface HasJSDocPredicate {hasJSDoc: { tag: string }}

export interface ExtendsClassPredicate {extendsClass: { name: string }}

export interface ImplementsInterfacePredicate {implementsInterface: { name: string }}

export interface NameEndsWithPredicate {nameEndsWith: { suffix: string }}

export interface NameMatchesPredicate {nameMatches: { pattern: string }}

export interface InClassWithPredicate {inClassWith: Predicate}

export interface AndPredicate {and: Predicate[]}

export interface OrPredicate {or: Predicate[]}

export type Predicate =
  | HasDecoratorPredicate
  | HasJSDocPredicate
  | ExtendsClassPredicate
  | ImplementsInterfacePredicate
  | NameEndsWithPredicate
  | NameMatchesPredicate
  | InClassWithPredicate
  | AndPredicate
  | OrPredicate

export interface NotUsed {notUsed: true}

export interface DetectionRule {
  find: FindTarget
  where: Predicate
}

export type ComponentRule = NotUsed | DetectionRule

/**
 * A module config as written in the extraction config file.
 * When `extends` is present, component rules are inherited from the extended config.
 * Local rules override inherited rules.
 */
export interface ModuleConfig {
  name: string
  path: string
  extends?: string
  api?: ComponentRule
  useCase?: ComponentRule
  domainOp?: ComponentRule
  event?: ComponentRule
  eventHandler?: ComponentRule
  ui?: ComponentRule
}

/**
 * A fully resolved module with all component rules.
 * This is what the extractor uses after config resolution.
 */
export interface Module {
  name: string
  path: string
  api: ComponentRule
  useCase: ComponentRule
  domainOp: ComponentRule
  event: ComponentRule
  eventHandler: ComponentRule
  ui: ComponentRule
}

/**
 * Extraction config as written in the config file.
 * Modules may use `extends` to inherit rules from other configs.
 */
export interface ExtractionConfig {
  $schema?: string
  modules: ModuleConfig[]
}

/**
 * Fully resolved extraction config ready for the extractor.
 * All extends references resolved, all modules have complete rules.
 */
export interface ResolvedExtractionConfig {
  $schema?: string
  modules: Module[]
}
