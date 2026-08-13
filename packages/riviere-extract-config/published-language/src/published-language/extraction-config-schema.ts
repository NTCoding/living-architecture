/**
 * AST element type to search for during extraction.
 */
/** @riviere-role published-language-union */
export type FindTarget = 'classes' | 'methods' | 'functions'

/**
 * Standard architectural component types recognized by the Riviere extractor.
 * Each type represents a distinct role in the system's flow-based architecture.
 */
/** @riviere-role published-language-union */
export type ComponentType = 'api' | 'useCase' | 'domainOp' | 'event' | 'eventHandler' | 'ui'

/** Matches elements with a specific decorator. */
/** @riviere-role published-language-data-structure */
export interface HasDecoratorPredicate {
  hasDecorator: {
    name: string | string[]
    from?: string
  }
}

/** Matches elements with a specific JSDoc tag. */
/** @riviere-role published-language-data-structure */
export interface HasJSDocPredicate {
  hasJSDoc: { tag: string }
}

/** Matches classes extending a specific base class. */
/** @riviere-role published-language-data-structure */
export interface ExtendsClassPredicate {
  extendsClass: { name: string }
}

/** Matches classes implementing a specific interface. */
/** @riviere-role published-language-data-structure */
export interface ImplementsInterfacePredicate {
  implementsInterface: { name: string }
}

/** Matches elements whose name ends with a suffix. */
/** @riviere-role published-language-data-structure */
export interface NameEndsWithPredicate {
  nameEndsWith: { suffix: string }
}

/** Matches elements whose name matches a regex pattern. */
/** @riviere-role published-language-data-structure */
export interface NameMatchesPredicate {
  nameMatches: { pattern: string }
}

/** Matches methods inside classes satisfying a predicate. */
/** @riviere-role published-language-data-structure */
export interface InClassWithPredicate {
  inClassWith: Predicate
}

/** Combines predicates with AND logic. */
/** @riviere-role published-language-data-structure */
export interface AndPredicate {
  and: Predicate[]
}

/** Combines predicates with OR logic. */
/** @riviere-role published-language-data-structure */
export interface OrPredicate {
  or: Predicate[]
}

/** Union of all predicate types for filtering AST elements. */
/** @riviere-role published-language-union */
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
/** @riviere-role published-language-data-structure */
export interface NotUsed {
  notUsed: true
}

/** Transform operations to apply to extracted values. */
/** @riviere-role published-language-data-structure */
export interface Transform {
  stripSuffix?: string
  stripPrefix?: string
  toLowerCase?: true
  toUpperCase?: true
  kebabToPascal?: true
  pascalToKebab?: true
}

/** Extracts a hardcoded literal value. */
/** @riviere-role published-language-data-structure */
export interface LiteralExtractionRule {
  literal: string | boolean | number
}

/** Extracts value from the class name. */
/** @riviere-role published-language-data-structure */
export interface FromClassNameExtractionRule {
  fromClassName: true | { transform?: Transform }
}

/** Extracts value from the method name. */
/** @riviere-role published-language-data-structure */
export interface FromMethodNameExtractionRule {
  fromMethodName: true | { transform?: Transform }
}

/** Extracts value from the file path using regex capture. */
/** @riviere-role published-language-data-structure */
export interface FromFilePathExtractionRule {
  fromFilePath: {
    pattern: string
    capture: number
    transform?: Transform
  }
}

/** Extracts value from a class property. */
/** @riviere-role published-language-data-structure */
export interface FromPropertyExtractionRule {
  fromProperty: {
    name: string
    kind: 'static' | 'instance'
    transform?: Transform
  }
}

/** Extracts value from decorator argument. */
/** @riviere-role published-language-data-structure */
export interface FromDecoratorArgExtractionRule {
  fromDecoratorArg: {
    decorator?: string
    position?: number
    name?: string
    transform?: Transform
  }
}

/** Extracts value from decorator argument on the containing class. */
/** @riviere-role published-language-data-structure */
export interface FromClassDecoratorArgExtractionRule {
  fromClassDecoratorArg:
    | {
        decorator: string
        position: number
        name?: never
        transform?: Transform
      }
    | {
        decorator: string
        name: string
        position?: never
        transform?: Transform
      }
}

/** Extracts value from the decorator name itself. */
/** @riviere-role published-language-data-structure */
export interface FromDecoratorNameExtractionRule {
  fromDecoratorName:
    | true
    | {
        mapping?: Record<string, string>
        transform?: Transform
      }
}

/** Extracts value from generic type argument. */
/** @riviere-role published-language-data-structure */
export interface FromGenericArgExtractionRule {
  fromGenericArg: {
    interface: string
    position: number
    transform?: Transform
  }
}

/** Extracts method parameters and return type. */
/** @riviere-role published-language-data-structure */
export interface FromMethodSignatureExtractionRule {
  fromMethodSignature: true
}

/** Extracts constructor parameter names and types. */
/** @riviere-role published-language-data-structure */
export interface FromConstructorParamsExtractionRule {
  fromConstructorParams: true
}

/** Extracts type name of parameter at position. */
/** @riviere-role published-language-data-structure */
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
/** @riviere-role published-language-union */
export type ExtractionRule =
  | LiteralExtractionRule
  | FromClassNameExtractionRule
  | FromMethodNameExtractionRule
  | FromFilePathExtractionRule
  | FromPropertyExtractionRule
  | FromDecoratorArgExtractionRule
  | FromClassDecoratorArgExtractionRule
  | FromDecoratorNameExtractionRule
  | FromGenericArgExtractionRule
  | FromMethodSignatureExtractionRule
  | FromConstructorParamsExtractionRule
  | FromParameterTypeExtractionRule

/**
 * Extract block mapping field names to extraction rules.
 * Each key is a Riviere schema field name (e.g., apiType, httpMethod, path).
 */
/** @riviere-role published-language-data-structure */
export interface ExtractBlock {
  [fieldName: string]: ExtractionRule
}

/** Rule specifying what to find and how to filter matches. */
/** @riviere-role published-language-data-structure */
export interface DetectionRule {
  find: FindTarget
  where: Predicate
  extract?: ExtractBlock
}

/** Either a detection rule or a marker that the component type is unused. */
/** @riviere-role published-language-union */
export type ComponentRule = NotUsed | DetectionRule

/** User-defined component types with their detection rules. */
/** @riviere-role published-language-data-structure */
export interface CustomTypes {
  [customTypeName: string]: DetectionRule
}

/**
 * Declares a custom component type as an event publisher.
 * The component type must be defined in customTypes in at least one module.
 */
/** @riviere-role published-language-data-structure */
export interface EventPublisherConfig {
  /** The custom component type name (e.g. 'eventPublisher'). */
  fromType: string
  /** The metadata key on this component type that holds the published event type name. */
  metadataKey: string
}

/**
 * Declares how to resolve HTTP client calls into cross-domain Links.
 * The custom type must be defined in customTypes in at least one module.
 */
/** @riviere-role published-language-data-structure */
export interface HttpLinkConfig {
  /** The custom component type name for HTTP clients (e.g. 'httpCall'). */
  fromCustomType: string
  /** Metadata key whose value identifies the target domain. */
  matchDomainBy: string
  /** Metadata keys used to match the target API component. */
  matchApiBy: string[]
}

/** Connection detection configuration. */
/** @riviere-role published-language-data-structure */
export interface ConnectionsConfig {
  /** Declares which custom component types publish events and how to detect them. */
  eventPublishers?: EventPublisherConfig[]
  /** Declares how to resolve HTTP client calls into cross-domain Links. */
  httpLinks?: HttpLinkConfig[]
}

/**
 * Reference to an external module definition file.
 * The CLI expands these references before extraction by loading the referenced file.
 */
/** @riviere-role published-language-data-structure */
export interface ModuleRef {
  $ref: string
}

/**
 * A module config as written in the extraction config file.
 * When `extends` is present, component rules are inherited from the extended config.
 * Local rules override inherited rules.
 */
interface ModuleIdentity {
  name: string
  domain: string
  path: string
  glob: string
  /** Path pattern with `{module}` placeholder for resolving module names from file paths. */
  modules?: string
  customTypes?: CustomTypes
}

interface ModuleRules {
  api: ComponentRule
  useCase: ComponentRule
  domainOp: ComponentRule
  event: ComponentRule
  eventHandler: ComponentRule
  ui: ComponentRule
}

/** @riviere-role published-language-data-structure */
export interface StandaloneDraftModule extends ModuleIdentity, ModuleRules {
  extends?: never
}

/** @riviere-role published-language-union */
export type DraftModule =
  | StandaloneDraftModule
  | (ModuleIdentity & Partial<ModuleRules> & { extends: string })

/**
 * A fully resolved module with all component rules.
 * This is what the extractor uses after config resolution.
 */
/** @riviere-role published-language-data-structure */
export interface ValidatedModuleInput extends ModuleIdentity, ModuleRules {}

/**
 * Extraction config after $ref expansion.
 * At this point all ModuleRef entries have been resolved to DraftModule.
 * This is what the extractor uses for processing.
 */
/** @riviere-role published-language-schema */
export interface DraftConfiguration {
  $schema?: string
  modules: DraftModule[]
  connections?: ConnectionsConfig
}

/**
 * Fully resolved extraction config ready for the extractor.
 * All extends references resolved, all modules have complete rules.
 */
/** @riviere-role published-language-data-structure */
export interface ValidatedConfigurationInput {
  $schema?: string
  modules: ValidatedModuleInput[]
  connections?: ConnectionsConfig
}
