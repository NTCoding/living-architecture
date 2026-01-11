/** AST element type to search for during extraction. */
export type FindTarget = 'classes' | 'methods' | 'functions'

/** Architectural component types recognized by the extractor. */
export type ComponentType = 'api' | 'useCase' | 'domainOp' | 'event' | 'eventHandler' | 'ui'

/** Matches elements with a specific decorator. */
export interface HasDecoratorPredicate {
  hasDecorator: {
    name: string | string[]
    from?: string
  }
}

/** Matches elements with a specific JSDoc tag. */
export interface HasJSDocPredicate {hasJSDoc: { tag: string }}

/** Matches classes extending a specific base class. */
export interface ExtendsClassPredicate {extendsClass: { name: string }}

/** Matches classes implementing a specific interface. */
export interface ImplementsInterfacePredicate {implementsInterface: { name: string }}

/** Matches elements whose name ends with a suffix. */
export interface NameEndsWithPredicate {nameEndsWith: { suffix: string }}

/** Matches elements whose name matches a regex pattern. */
export interface NameMatchesPredicate {nameMatches: { pattern: string }}

/** Matches methods inside classes satisfying a predicate. */
export interface InClassWithPredicate {inClassWith: Predicate}

/** Combines predicates with AND logic. */
export interface AndPredicate {and: Predicate[]}

/** Combines predicates with OR logic. */
export interface OrPredicate {or: Predicate[]}

/** Union of all predicate types for filtering AST elements. */
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

/** Marker indicating a component type is not used in the module. */
export interface NotUsed {notUsed: true}

/** Rule specifying what to find and how to filter matches. */
export interface DetectionRule {
  find: FindTarget
  where: Predicate
}

/** Either a detection rule or a marker that the component type is unused. */
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
