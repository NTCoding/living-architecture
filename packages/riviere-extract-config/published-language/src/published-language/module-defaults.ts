import type {
  ComponentRuleInput,
  CustomTypesInput,
  DraftConfiguration,
  ModuleRules,
  ValidatedModuleInput,
} from './extraction-config-schema'
import { parseExtractionConfigSchema } from './validation'
import { z } from 'zod'

const NOT_USED = { notUsed: true } as const

const MODULES_CONFIG_SCHEMA = z.looseObject({
  modules: z.array(z.unknown()),
})

const COMPONENT_RULE_SCHEMA = z.custom<ComponentRuleInput>((value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  if ('notUsed' in value) return value.notUsed === true
  return 'find' in value
})

const CUSTOM_TYPES_SCHEMA = z.custom<CustomTypesInput>((value) => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
})

const MODULE_RULES_SOURCE_SCHEMA = z.looseObject({
  api: COMPONENT_RULE_SCHEMA.optional(),
  useCase: COMPONENT_RULE_SCHEMA.optional(),
  domainOp: COMPONENT_RULE_SCHEMA.optional(),
  event: COMPONENT_RULE_SCHEMA.optional(),
  eventHandler: COMPONENT_RULE_SCHEMA.optional(),
  ui: COMPONENT_RULE_SCHEMA.optional(),
  customTypes: CUSTOM_TYPES_SCHEMA.optional(),
  modules: z.never().optional(),
})

type ModuleRulesWithCustomTypes = ModuleRules & Readonly<{ customTypes?: CustomTypesInput }>

/** @riviere-role value-object */
export class ModuleDefaults {
  declare private readonly brand: 'ModuleDefaults'

  static parse(source: unknown): ModuleDefaultsParseResult {
    const modulesConfig = MODULES_CONFIG_SCHEMA.safeParse(source)
    if (modulesConfig.success) {
      const parsed = parseExtractionConfigSchema(source)
      if (!parsed.success) {
        return {
          success: false,
          issues: parsed.errors.map((error) => `${error.path}: ${error.message}`),
        }
      }
      return { success: true, source: { kind: 'configuration', config: parsed.configuration } }
    }
    const rulesSource = MODULE_RULES_SOURCE_SCHEMA.safeParse(source)
    if (!rulesSource.success) {
      return { success: false, issues: ['expected an object with component rules'] }
    }
    return {
      success: true,
      source: {
        kind: 'rules',
        defaults: new ModuleDefaults({
          api: rulesSource.data.api ?? NOT_USED,
          useCase: rulesSource.data.useCase ?? NOT_USED,
          domainOp: rulesSource.data.domainOp ?? NOT_USED,
          event: rulesSource.data.event ?? NOT_USED,
          eventHandler: rulesSource.data.eventHandler ?? NOT_USED,
          ui: rulesSource.data.ui ?? NOT_USED,
          ...(rulesSource.data.customTypes === undefined
            ? {}
            : { customTypes: rulesSource.data.customTypes }),
        }),
      },
    }
  }

  static fromResolvedModule(module: ValidatedModuleInput): ModuleDefaults {
    return new ModuleDefaults({
      api: module.api,
      useCase: module.useCase,
      domainOp: module.domainOp,
      event: module.event,
      eventHandler: module.eventHandler,
      ui: module.ui,
      ...(module.customTypes === undefined ? {} : { customTypes: module.customTypes }),
    })
  }

  private constructor(
    private readonly rules: Readonly<{
      api: ComponentRuleInput
      useCase: ComponentRuleInput
      domainOp: ComponentRuleInput
      event: ComponentRuleInput
      eventHandler: ComponentRuleInput
      ui: ComponentRuleInput
      customTypes?: CustomTypesInput
    }>,
  ) {}

  mergeWith(module: Readonly<Partial<ValidatedModuleInput>>): ModuleRulesWithCustomTypes {
    const mergedCustomTypes =
      this.rules.customTypes === undefined && module.customTypes === undefined
        ? undefined
        : { ...this.rules.customTypes, ...module.customTypes }
    return {
      api: module.api ?? this.rules.api,
      useCase: module.useCase ?? this.rules.useCase,
      domainOp: module.domainOp ?? this.rules.domainOp,
      event: module.event ?? this.rules.event,
      eventHandler: module.eventHandler ?? this.rules.eventHandler,
      ui: module.ui ?? this.rules.ui,
      ...(mergedCustomTypes === undefined ? {} : { customTypes: mergedCustomTypes }),
    }
  }
}

/** @riviere-role published-language-schema */
export interface ModuleRulesSource {
  readonly kind: 'rules'
  readonly defaults: ModuleDefaults
}

/** @riviere-role published-language-schema */
export interface ModuleConfigurationSource {
  readonly kind: 'configuration'
  readonly config: DraftConfiguration
}

/** @riviere-role published-language-union */
export type ModuleDefaultsSource = ModuleRulesSource | ModuleConfigurationSource

/** @riviere-role published-language-data-structure */
export interface ModuleDefaultsParseSuccess {
  readonly success: true
  readonly source: ModuleDefaultsSource
}

/** @riviere-role published-language-data-structure */
export interface ModuleDefaultsParseFailure {
  readonly success: false
  readonly issues: readonly string[]
}

/** @riviere-role published-language-union */
export type ModuleDefaultsParseResult = ModuleDefaultsParseSuccess | ModuleDefaultsParseFailure
