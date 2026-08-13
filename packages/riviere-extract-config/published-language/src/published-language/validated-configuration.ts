import type {
  ComponentRule,
  ComponentType,
  ConnectionsConfig,
  CustomTypes,
  ValidatedConfigurationInput,
  ValidatedModuleInput,
} from './extraction-config-schema'
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

/** @riviere-role value-object */
export class ValidatedModule {
  declare private readonly brand: 'ValidatedModule'
  readonly #values: Readonly<ValidatedModuleInput>

  private constructor(values: Readonly<ValidatedModuleInput>) {
    this.#values = values
  }

  static parse(input: Readonly<ValidatedModuleInput>): ValidatedModuleParseResult {
    const errors = validateModule(input)
    if (errors.length > 0) {
      return { success: false, errors }
    }
    return { success: true, data: new ValidatedModule(input) }
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

type ValidatedConfigurationParseResult =
  | { success: true; data: ValidatedConfiguration }
  | { success: false; errors: ValidationError[] }

/** @riviere-role value-object */
export class ValidatedConfiguration {
  declare private readonly brand: 'ValidatedConfiguration'
  readonly #modules: readonly ValidatedModule[]

  private constructor(
    modules: readonly ValidatedModule[],
    readonly connections: ConnectionsConfig | undefined,
    readonly schema: string | undefined,
  ) {
    this.#modules = modules
  }

  static parse(input: Readonly<ValidatedConfigurationInput>): ValidatedConfigurationParseResult {
    const modules: ValidatedModule[] = []
    const moduleErrors: ValidationError[] = []
    input.modules.forEach((module, index) => {
      const result = ValidatedModule.parse(module)
      if (result.success) {
        modules.push(result.data)
        return
      }
      moduleErrors.push(
        ...result.errors.map((error) => ({
          ...error,
          path: `/modules/${index}${error.path}`,
        })),
      )
    })
    const connectionErrors = validateConnections(input)
    const errors = [...moduleErrors, ...connectionErrors]
    if (errors.length > 0) {
      return { success: false, errors }
    }

    return {
      success: true,
      data: new ValidatedConfiguration(modules, input.connections, input.$schema),
    }
  }

  get modules(): readonly ValidatedModule[] {
    return this.#modules
  }
}

function validateModule(module: Readonly<ValidatedModuleInput>): ValidationError[] {
  return COMPONENT_TYPES.flatMap((componentType) => {
    const rule = module[componentType]
    if ('notUsed' in rule) {
      return []
    }
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

function validateConnections(input: Readonly<ValidatedConfigurationInput>): ValidationError[] {
  if (input.connections === undefined) return []

  const customTypeFields = new Map<string, Set<string>>()
  for (const module of input.modules) {
    for (const [typeName, rule] of Object.entries(module.customTypes ?? {})) {
      const fields = customTypeFields.get(typeName) ?? new Set<string>()
      for (const field of Object.keys(rule.extract ?? {})) fields.add(field)
      customTypeFields.set(typeName, fields)
    }
  }

  return [
    ...validateEventPublishers(input.connections, customTypeFields),
    ...validateHttpLinks(input.connections, customTypeFields),
  ]
}

function validateEventPublishers(
  connections: ConnectionsConfig,
  customTypeFields: ReadonlyMap<string, ReadonlySet<string>>,
): ValidationError[] {
  return (connections.eventPublishers ?? []).flatMap((publisher, index) => {
    const fields = customTypeFields.get(publisher.fromType)
    if (fields === undefined) {
      return [
        {
          path: `/connections/eventPublishers/${index}/fromType`,
          message: `"${publisher.fromType}" is not defined as a customType in any module.`,
        },
      ]
    }
    return fields.has(publisher.metadataKey)
      ? []
      : [
          {
            path: `/connections/eventPublishers/${index}/metadataKey`,
            message: `customType "${publisher.fromType}" does not extract "${publisher.metadataKey}".`,
          },
        ]
  })
}

function validateHttpLinks(
  connections: ConnectionsConfig,
  customTypeFields: ReadonlyMap<string, ReadonlySet<string>>,
): ValidationError[] {
  return (connections.httpLinks ?? []).flatMap((httpLink, index) => {
    const fields = customTypeFields.get(httpLink.fromCustomType)
    if (fields === undefined) {
      return [
        {
          path: `/connections/httpLinks/${index}/fromCustomType`,
          message: `"${httpLink.fromCustomType}" is not defined as a customType in any module.`,
        },
      ]
    }
    const requiredFields = [httpLink.matchDomainBy, ...httpLink.matchApiBy]
    return requiredFields.flatMap((field) =>
      fields.has(field)
        ? []
        : [
            {
              path: `/connections/httpLinks/${index}`,
              message: `customType "${httpLink.fromCustomType}" does not extract "${field}".`,
            },
          ],
    )
  })
}
