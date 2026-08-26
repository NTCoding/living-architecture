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
export interface HasDecoratorPredicateInput {
  hasDecorator: {
    name: string | readonly string[]
    from?: string | undefined
  }
}

/** Matches elements with a specific JSDoc tag. */
/** @riviere-role published-language-data-structure */
export interface HasJSDocPredicateInput {
  hasJSDoc: { tag: string }
}

/** Matches classes extending a specific base class. */
/** @riviere-role published-language-data-structure */
export interface ExtendsClassPredicateInput {
  extendsClass: { name: string }
}

/** Matches classes implementing a specific interface. */
/** @riviere-role published-language-data-structure */
export interface ImplementsInterfacePredicateInput {
  implementsInterface: { name: string }
}

/** Matches elements whose name ends with a suffix. */
/** @riviere-role published-language-data-structure */
export interface NameEndsWithPredicateInput {
  nameEndsWith: { suffix: string }
}

/** Matches elements whose name matches a regex pattern. */
/** @riviere-role published-language-data-structure */
export interface NameMatchesPredicateInput {
  nameMatches: { pattern: string }
}

/** Matches methods inside classes satisfying a predicate. */
/** @riviere-role published-language-data-structure */
export interface InClassWithPredicateInput {
  inClassWith: PredicateInput
}

/** Combines predicates with AND logic. */
/** @riviere-role published-language-data-structure */
export interface AndPredicateInput {
  and: PredicateInput[]
}

/** Combines predicates with OR logic. */
/** @riviere-role published-language-data-structure */
export interface OrPredicateInput {
  or: PredicateInput[]
}

/** Union of all predicate types for filtering AST elements. */
/** @riviere-role published-language-union */
export type PredicateInput =
  | HasDecoratorPredicateInput
  | HasJSDocPredicateInput
  | ExtendsClassPredicateInput
  | ImplementsInterfacePredicateInput
  | NameEndsWithPredicateInput
  | NameMatchesPredicateInput
  | InClassWithPredicateInput
  | AndPredicateInput
  | OrPredicateInput

/** Marker indicating a component type is not used in the module. */
/** @riviere-role published-language-data-structure */
export interface NotUsedInput {
  notUsed: true
}

/** Transform operations to apply to extracted values. */
/** @riviere-role published-language-data-structure */
export interface ExtractionTransformInput {
  stripSuffix?: string | undefined
  stripPrefix?: string | undefined
  toLowerCase?: true | undefined
  toUpperCase?: true | undefined
  kebabToPascal?: true | undefined
  pascalToKebab?: true | undefined
}

/** Extracts a hardcoded literal value. */
/** @riviere-role published-language-data-structure */
export interface LiteralExtractionRuleInput {
  literal: string | boolean | number
}

/** Extracts value from the class name. */
/** @riviere-role published-language-data-structure */
export interface FromClassNameExtractionRuleInput {
  fromClassName: true | { transform?: ExtractionTransformInput }
}

/** Extracts value from the method name. */
/** @riviere-role published-language-data-structure */
export interface FromMethodNameExtractionRuleInput {
  fromMethodName: true | { transform?: ExtractionTransformInput }
}

/** Extracts value from the file path using regex capture. */
/** @riviere-role published-language-data-structure */
export interface FromFilePathExtractionRuleInput {
  fromFilePath: {
    pattern: string
    capture: number
    transform?: ExtractionTransformInput
  }
}

/** Extracts value from a class property. */
/** @riviere-role published-language-data-structure */
export interface FromPropertyExtractionRuleInput {
  fromProperty: {
    name: string
    kind: 'static' | 'instance'
    transform?: ExtractionTransformInput
  }
}

/** Extracts value from decorator argument. */
/** @riviere-role published-language-data-structure */
export interface FromDecoratorArgExtractionRuleInput {
  fromDecoratorArg: {
    decorator?: string
    position?: number
    name?: string
    transform?: ExtractionTransformInput
  }
}

/** Extracts value from decorator argument on the containing class. */
/** @riviere-role published-language-data-structure */
export interface FromClassDecoratorArgExtractionRuleInput {
  fromClassDecoratorArg:
    | {
        decorator: string
        position: number
        name?: never
        transform?: ExtractionTransformInput
      }
    | {
        decorator: string
        name: string
        position?: never
        transform?: ExtractionTransformInput
      }
}

/** Extracts value from the decorator name itself. */
/** @riviere-role published-language-data-structure */
export interface FromDecoratorNameExtractionRuleInput {
  fromDecoratorName:
    | true
    | {
        mapping?: Record<string, string>
        transform?: ExtractionTransformInput
      }
}

/** Extracts value from generic type argument. */
/** @riviere-role published-language-data-structure */
export interface FromGenericArgExtractionRuleInput {
  fromGenericArg: {
    interface: string
    position: number
    transform?: ExtractionTransformInput
  }
}

/** Extracts method parameters and return type. */
/** @riviere-role published-language-data-structure */
export interface FromMethodSignatureExtractionRuleInput {
  fromMethodSignature: true
}

/** Extracts constructor parameter names and types. */
/** @riviere-role published-language-data-structure */
export interface FromConstructorParamsExtractionRuleInput {
  fromConstructorParams: true
}

/** Extracts type name of parameter at position. */
/** @riviere-role published-language-data-structure */
export interface FromParameterTypeExtractionRuleInput {
  fromParameterType: {
    position: number
    transform?: ExtractionTransformInput
  }
}

/**
 * Union of all extraction rule types.
 * Each rule type corresponds to a different source of metadata.
 */
/** @riviere-role published-language-union */
export type ExtractionRuleInput =
  | LiteralExtractionRuleInput
  | FromClassNameExtractionRuleInput
  | FromMethodNameExtractionRuleInput
  | FromFilePathExtractionRuleInput
  | FromPropertyExtractionRuleInput
  | FromDecoratorArgExtractionRuleInput
  | FromClassDecoratorArgExtractionRuleInput
  | FromDecoratorNameExtractionRuleInput
  | FromGenericArgExtractionRuleInput
  | FromMethodSignatureExtractionRuleInput
  | FromConstructorParamsExtractionRuleInput
  | FromParameterTypeExtractionRuleInput

/**
 * Extract block mapping field names to extraction rules.
 * Each key is a Riviere schema field name (e.g., apiType, httpMethod, path).
 */
/** @riviere-role published-language-data-structure */
export interface ExtractBlockInput {
  [fieldName: string]: ExtractionRuleInput
}

/** Rule specifying what to find and how to filter matches. */
/** @riviere-role published-language-data-structure */
export interface DetectionRuleInput {
  find: FindTarget
  where: PredicateInput
  extract?: ExtractBlockInput
}

/** Either a detection rule or a marker that the component type is unused. */
/** @riviere-role published-language-union */
export type ComponentRuleInput = NotUsedInput | DetectionRuleInput

/** User-defined component types with their detection rules. */
/** @riviere-role published-language-data-structure */
export interface CustomTypesInput {
  [customTypeName: string]: DetectionRuleInput
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
  customTypes?: CustomTypesInput
}

interface ModuleRules {
  api: ComponentRuleInput
  useCase: ComponentRuleInput
  domainOp: ComponentRuleInput
  event: ComponentRuleInput
  eventHandler: ComponentRuleInput
  ui: ComponentRuleInput
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
  modules: [DraftModule, ...DraftModule[]]
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
