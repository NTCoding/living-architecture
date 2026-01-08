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

export interface ExtractionConfig {
  $schema?: string
  modules: Module[]
}
