/**
 * AST element type to search for during extraction.
 */
export type FindTarget = 'classes' | 'methods' | 'functions'

/**
 * Standard architectural component types recognized by the Riviere extractor.
 * Each type represents a distinct role in the system's flow-based architecture.
 */
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

/** Transform operations to apply to extracted values. */
export interface Transform {
  stripSuffix?: string
  stripPrefix?: string
  toLowerCase?: true
  toUpperCase?: true
  kebabToPascal?: true
  pascalToKebab?: true
}

/** Extracts a hardcoded literal value. */
export interface LiteralExtractionRule {literal: string | boolean | number}

/** Extracts value from the class name. */
export interface FromClassNameExtractionRule {fromClassName: true | { transform?: Transform }}

/** Extracts value from the method name. */
export interface FromMethodNameExtractionRule {fromMethodName: true | { transform?: Transform }}

/** Extracts value from the file path using regex capture. */
export interface FromFilePathExtractionRule {
  fromFilePath: {
    pattern: string
    capture: number
    transform?: Transform
  }
}

/** Extracts value from a class property. */
export interface FromPropertyExtractionRule {
  fromProperty: {
    name: string
    kind: 'static' | 'instance'
    transform?: Transform
  }
}

/** Extracts value from decorator argument. */
export interface FromDecoratorArgExtractionRule {
  fromDecoratorArg: {
    position?: number
    name?: string
    transform?: Transform
  }
}

/** Extracts value from the decorator name itself. */
export interface FromDecoratorNameExtractionRule {
  fromDecoratorName:
    | true
    | {
      mapping?: Record<string, string>
      transform?: Transform
    }
}

/** Extracts value from generic type argument. */
export interface FromGenericArgExtractionRule {
  fromGenericArg: {
    interface: string
    position: number
    transform?: Transform
  }
}

/** Extracts method parameters and return type. */
export interface FromMethodSignatureExtractionRule {fromMethodSignature: true}

/** Extracts constructor parameter names and types. */
export interface FromConstructorParamsExtractionRule {fromConstructorParams: true}

/** Extracts type name of parameter at position. */
export interface FromParameterTypeExtractionRule {
  fromParameterType: {
    position: number
    transform?: Transform
  }
}

/**
 * Union of all extraction rule types.
 * Each rule type corresponds to a different source of metadata.
 */
export type ExtractionRule =
  | LiteralExtractionRule
  | FromClassNameExtractionRule
  | FromMethodNameExtractionRule
  | FromFilePathExtractionRule
  | FromPropertyExtractionRule
  | FromDecoratorArgExtractionRule
  | FromDecoratorNameExtractionRule
  | FromGenericArgExtractionRule
  | FromMethodSignatureExtractionRule
  | FromConstructorParamsExtractionRule
  | FromParameterTypeExtractionRule

/**
 * Extract block mapping field names to extraction rules.
 * Each key is a Riviere schema field name (e.g., apiType, httpMethod, path).
 */
export type ExtractBlock = Record<string, ExtractionRule>

/** Rule specifying what to find and how to filter matches. */
export interface DetectionRule {
  find: FindTarget
  where: Predicate
  extract?: ExtractBlock
}

/** Either a detection rule or a marker that the component type is unused. */
export type ComponentRule = NotUsed | DetectionRule

/** User-defined component types with their detection rules. */
export type CustomTypes = Record<string, DetectionRule>

/**
 * Reference to an external module definition file.
 * The CLI expands these references before extraction by loading the referenced file.
 */
export interface ModuleRef {$ref: string}

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
  customTypes?: CustomTypes
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
  customTypes?: CustomTypes
}

/**
 * Extraction config after $ref expansion.
 * At this point all ModuleRef entries have been resolved to ModuleConfig.
 * This is what the extractor uses for processing.
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
