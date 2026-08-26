import type {
  ComponentRuleInput,
  ComponentType,
  CustomTypesInput,
  DetectionRuleInput,
  ExtractBlockInput,
  ExtractionRuleInput,
  FromParameterTypeExtractionRuleInput,
  OrPredicateInput,
  PredicateInput,
  ValidatedModuleInput,
} from './extraction-config-schema'
import {
  type ExtractionRule,
  FromClassDecoratorArgExtractionRule,
  FromClassNameExtractionRule,
  FromConstructorParamsExtractionRule,
  FromDecoratorArgExtractionRule,
  FromDecoratorNameExtractionRule,
  FromFilePathExtractionRule,
  FromGenericArgExtractionRule,
  FromMethodNameExtractionRule,
  FromMethodSignatureExtractionRule,
  FromParameterTypeExtractionRule,
  FromPropertyExtractionRule,
  LiteralExtractionRule,
} from './extraction-rule'
import type { ComponentRule, CustomTypes, DetectionRule, ExtractBlock } from './component-rule'
import {
  AndPredicate,
  ExtendsClassPredicate,
  HasDecoratorPredicate,
  HasJSDocPredicate,
  ImplementsInterfacePredicate,
  InClassWithPredicate,
  NameEndsWithPredicate,
  NameMatchesPredicate,
  OrPredicate,
  type Predicate,
} from './predicate'
import type { ValidationError } from './validation'

const REQUIRED_FIELDS: Record<ComponentType, readonly string[]> = {
  api: ['apiType'],
  useCase: [],
  domainOp: ['operationName'],
  event: ['eventName'],
  eventHandler: ['subscribedEvents'],
  ui: ['route'],
}

const COMPONENT_TYPES: readonly ComponentType[] = [
  'api',
  'useCase',
  'domainOp',
  'event',
  'eventHandler',
  'ui',
]

type ValidatedModuleParseResult =
  | { success: true; data: ValidatedModule }
  | { success: false; errors: ValidationError[] }

type ParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: readonly ValidationError[] }

type ExtractionRuleParseResult =
  | { readonly success: true; readonly data: ExtractionRule }
  | { readonly success: false; readonly errors: readonly string[] }

interface ValidatedModuleValues {
  readonly name: string
  readonly domain: string
  readonly path: string
  readonly glob: string
  readonly modules?: string
  readonly api: ComponentRule
  readonly useCase: ComponentRule
  readonly domainOp: ComponentRule
  readonly event: ComponentRule
  readonly eventHandler: ComponentRule
  readonly ui: ComponentRule
  readonly customTypes?: CustomTypes
}

interface ParsedModuleRules {
  readonly api: ComponentRule
  readonly useCase: ComponentRule
  readonly domainOp: ComponentRule
  readonly event: ComponentRule
  readonly eventHandler: ComponentRule
  readonly ui: ComponentRule
  readonly customTypes?: CustomTypes
}

/** @riviere-role value-object */
export class ValidatedModule {
  declare private readonly brand: 'ValidatedModule'
  readonly #values: ValidatedModuleValues

  private constructor(values: ValidatedModuleValues) {
    this.#values = values
  }

  static parse(input: Readonly<ValidatedModuleInput>): ValidatedModuleParseResult {
    const validationErrors = validateModule(input)
    const parsedRules = parseModuleRules(input)
    if (!parsedRules.success) {
      return { success: false, errors: [...validationErrors, ...parsedRules.errors] }
    }
    if (validationErrors.length > 0) return { success: false, errors: validationErrors }
    return {
      success: true,
      data: new ValidatedModule({
        name: input.name,
        domain: input.domain,
        path: input.path,
        glob: input.glob,
        ...(input.modules === undefined ? {} : { modules: input.modules }),
        ...parsedRules.data,
      }),
    }
  }

  get name(): string {
    return this.#values.name
  }

  get domain(): string {
    return this.#values.domain
  }

  get path(): string {
    return this.#values.path
  }

  get glob(): string {
    return this.#values.glob
  }

  get modules(): string | undefined {
    return this.#values.modules
  }

  get api(): ComponentRule {
    return this.#values.api
  }

  get useCase(): ComponentRule {
    return this.#values.useCase
  }

  get domainOp(): ComponentRule {
    return this.#values.domainOp
  }

  get event(): ComponentRule {
    return this.#values.event
  }

  get eventHandler(): ComponentRule {
    return this.#values.eventHandler
  }

  get ui(): ComponentRule {
    return this.#values.ui
  }

  get customTypes(): CustomTypes | undefined {
    return this.#values.customTypes
  }

  ruleFor(componentType: ComponentType): ComponentRule {
    return this.#values[componentType]
  }
}

type PropertiesOf<Union> = Union extends unknown ? keyof Union : never

function hasUnionMemberProperty<
  Union extends object,
  Property extends PropertiesOf<Union>,
>(input: Union, property: Property): input is Extract<Union, Record<Property, unknown>> {
  return Object.hasOwn(input, property)
}

function parseExtractionRule(input: ExtractionRuleInput): ExtractionRuleParseResult {
  if (hasUnionMemberProperty(input, 'literal')) return LiteralExtractionRule.parse(input)
  if (hasUnionMemberProperty(input, 'fromClassName')) {
    return FromClassNameExtractionRule.parse(input)
  }
  if (hasUnionMemberProperty(input, 'fromMethodName')) {
    return FromMethodNameExtractionRule.parse(input)
  }
  if (hasUnionMemberProperty(input, 'fromFilePath')) {
    return FromFilePathExtractionRule.parse(input)
  }
  if (hasUnionMemberProperty(input, 'fromProperty')) {
    return FromPropertyExtractionRule.parse(input)
  }
  if (hasUnionMemberProperty(input, 'fromDecoratorArg')) {
    return FromDecoratorArgExtractionRule.parse(input)
  }
  if (hasUnionMemberProperty(input, 'fromClassDecoratorArg')) {
    return FromClassDecoratorArgExtractionRule.parse(input)
  }
  if (hasUnionMemberProperty(input, 'fromDecoratorName')) {
    return FromDecoratorNameExtractionRule.parse(input)
  }
  if (hasUnionMemberProperty(input, 'fromGenericArg')) {
    return FromGenericArgExtractionRule.parse(input)
  }
  if (hasUnionMemberProperty(input, 'fromMethodSignature')) {
    return FromMethodSignatureExtractionRule.parse(input)
  }
  if (hasUnionMemberProperty(input, 'fromConstructorParams')) {
    return FromConstructorParamsExtractionRule.parse(input)
  }
  input satisfies FromParameterTypeExtractionRuleInput
  return FromParameterTypeExtractionRule.parse(input)
}

function parseExtractBlock(
  input: ExtractBlockInput | undefined,
  path: string,
): ParseResult<ExtractBlock | undefined> {
  if (input === undefined) return { success: true, data: undefined }

  const extract: Record<string, ExtractionRule> = {}
  const errors: ValidationError[] = []
  for (const [field, ruleInput] of Object.entries(input)) {
    const result = parseExtractionRule(ruleInput)
    if (result.success) {
      extract[field] = result.data
      continue
    }
    errors.push(
      ...result.errors.map((message) => ({
        path: `${path}/extract/${field}`,
        message,
      })),
    )
  }
  return errors.length === 0 ? { success: true, data: extract } : { success: false, errors }
}

function parseDetectionRule(input: DetectionRuleInput, path: string): ParseResult<DetectionRule> {
  const extract = parseExtractBlock(input.extract, path)
  if (!extract.success) return extract
  const predicate = parsePredicateInput(input.where)
  if (!predicate.success) {
    return {
      success: false,
      errors: predicate.errors.map((message) => ({ path: `${path}/where`, message })),
    }
  }
  return {
    success: true,
    data: {
      kind: 'detection',
      find: input.find,
      where: predicate.data,
      ...(extract.data === undefined ? {} : { extract: extract.data }),
    },
  }
}

type PredicateInputParseResult =
  | { readonly success: true; readonly data: Predicate }
  | { readonly success: false; readonly errors: readonly string[] }

function parsePredicateInput(input: PredicateInput): PredicateInputParseResult {
  if (hasUnionMemberProperty(input, 'hasDecorator')) return HasDecoratorPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'hasJSDoc')) return HasJSDocPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'extendsClass')) return ExtendsClassPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'implementsInterface')) {
    return ImplementsInterfacePredicate.parse(input)
  }
  if (hasUnionMemberProperty(input, 'nameEndsWith')) return NameEndsWithPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'nameMatches')) return NameMatchesPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'inClassWith')) return InClassWithPredicate.parse(input)
  if (hasUnionMemberProperty(input, 'and')) return AndPredicate.parse(input)
  input satisfies OrPredicateInput
  return OrPredicate.parse(input)
}

function parseComponentRule(input: ComponentRuleInput, path: string): ParseResult<ComponentRule> {
  if (hasUnionMemberProperty(input, 'notUsed')) {
    return { success: true, data: { kind: 'notUsed' } }
  }
  input satisfies DetectionRuleInput
  return parseDetectionRule(input, path)
}

function parseCustomTypes(
  input: CustomTypesInput | undefined,
): ParseResult<CustomTypes | undefined> {
  if (input === undefined) return { success: true, data: undefined }

  const customTypes: Record<string, DetectionRule> = {}
  const errors: ValidationError[] = []
  for (const [name, ruleInput] of Object.entries(input)) {
    const result = parseDetectionRule(ruleInput, `/customTypes/${name}`)
    if (result.success) {
      customTypes[name] = result.data
      continue
    }
    errors.push(...result.errors)
  }
  return errors.length === 0 ? { success: true, data: customTypes } : { success: false, errors }
}

function parseModuleRules(input: ValidatedModuleInput): ParseResult<ParsedModuleRules> {
  const api = parseComponentRule(input.api, '/api')
  const useCase = parseComponentRule(input.useCase, '/useCase')
  const domainOp = parseComponentRule(input.domainOp, '/domainOp')
  const event = parseComponentRule(input.event, '/event')
  const eventHandler = parseComponentRule(input.eventHandler, '/eventHandler')
  const ui = parseComponentRule(input.ui, '/ui')
  const customTypes = parseCustomTypes(input.customTypes)
  const results = [api, useCase, domainOp, event, eventHandler, ui, customTypes]
  const errors = results.flatMap((result) => (result.success ? [] : result.errors))
  if (
    !api.success ||
    !useCase.success ||
    !domainOp.success ||
    !event.success ||
    !eventHandler.success ||
    !ui.success ||
    !customTypes.success
  ) {
    return { success: false, errors }
  }
  return {
    success: true,
    data: {
      api: api.data,
      useCase: useCase.data,
      domainOp: domainOp.data,
      event: event.data,
      eventHandler: eventHandler.data,
      ui: ui.data,
      ...(customTypes.data === undefined ? {} : { customTypes: customTypes.data }),
    },
  }
}

function validateModule(module: Readonly<ValidatedModuleInput>): ValidationError[] {
  return COMPONENT_TYPES.flatMap((componentType) => {
    const rule = module[componentType]
    if (hasUnionMemberProperty(rule, 'notUsed')) return []
    const extractedFields = new Set(Object.keys(rule.extract ?? {}))
    const missingFields = REQUIRED_FIELDS[componentType].filter(
      (field) => !extractedFields.has(field),
    )
    return missingFields.length === 0
      ? []
      : [
          {
            path: `/${componentType}`,
            message:
              `Missing required extraction rules: ${missingFields.join(', ')}. ` +
              `Add extraction rules to the 'extract' block or use 'notUsed: true' if not extracting ${componentType} components.`,
          },
        ]
  })
}
