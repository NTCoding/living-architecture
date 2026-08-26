import { z } from 'zod'

/** @riviere-role published-language-data-structure */
export interface ExtractionTransform {
  readonly stripSuffix?: string | undefined
  readonly stripPrefix?: string | undefined
  readonly toLowerCase?: true | undefined
  readonly toUpperCase?: true | undefined
  readonly kebabToPascal?: true | undefined
  readonly pascalToKebab?: true | undefined
}

const extractionTransformSchema: z.ZodType<ExtractionTransform> = z
  .object({
    stripSuffix: z.string().optional(),
    stripPrefix: z.string().optional(),
    toLowerCase: z.literal(true).optional(),
    toUpperCase: z.literal(true).optional(),
    kebabToPascal: z.literal(true).optional(),
    pascalToKebab: z.literal(true).optional(),
  })
  .strict()
  .readonly()

/** @riviere-role published-language-union */
export type DecoratorArgumentSelector =
  | { readonly kind: 'position'; readonly position: number }
  | { readonly kind: 'name'; readonly name: string }

type RuleParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: readonly string[] }

function parseRule<TInput, TRule>(
  schema: z.ZodType<TInput>,
  input: unknown,
  createRule: (parsed: TInput) => TRule,
): RuleParseResult<TRule> {
  const result = schema.safeParse(input)
  return result.success
    ? { success: true, data: createRule(result.data) }
    : { success: false, errors: result.error.issues.map((issue) => issue.message) }
}

const literalSchema = z.object({ literal: z.union([z.string(), z.boolean(), z.number()]) }).strict()

/** @riviere-role value-object */
export class LiteralExtractionRule {
  declare private readonly brand: 'LiteralExtractionRule'
  readonly kind = 'literal' as const

  private constructor(readonly value: string | boolean | number) {}

  static parse(input: unknown): RuleParseResult<LiteralExtractionRule> {
    return parseRule(literalSchema, input, ({ literal }) => new LiteralExtractionRule(literal))
  }
}

const fromClassNameSchema = z
  .object({
    fromClassName: z.union([
      z.literal(true),
      z.object({ transform: extractionTransformSchema.optional() }).strict(),
    ]),
  })
  .strict()

/** @riviere-role value-object */
export class FromClassNameExtractionRule {
  declare private readonly brand: 'FromClassNameExtractionRule'
  readonly kind = 'fromClassName' as const

  private constructor(readonly transform: ExtractionTransform | undefined) {}

  static parse(input: unknown): RuleParseResult<FromClassNameExtractionRule> {
    return parseRule(
      fromClassNameSchema,
      input,
      ({ fromClassName }) =>
        new FromClassNameExtractionRule(
          fromClassName === true ? undefined : fromClassName.transform,
        ),
    )
  }
}

const fromMethodNameSchema = z
  .object({
    fromMethodName: z.union([
      z.literal(true),
      z.object({ transform: extractionTransformSchema.optional() }).strict(),
    ]),
  })
  .strict()

/** @riviere-role value-object */
export class FromMethodNameExtractionRule {
  declare private readonly brand: 'FromMethodNameExtractionRule'
  readonly kind = 'fromMethodName' as const

  private constructor(readonly transform: ExtractionTransform | undefined) {}

  static parse(input: unknown): RuleParseResult<FromMethodNameExtractionRule> {
    return parseRule(
      fromMethodNameSchema,
      input,
      ({ fromMethodName }) =>
        new FromMethodNameExtractionRule(
          fromMethodName === true ? undefined : fromMethodName.transform,
        ),
    )
  }
}

const fromFilePathSchema = z
  .object({
    fromFilePath: z
      .object({
        pattern: z
          .string()
          .min(1)
          .refine((pattern) => {
            try {
              new RegExp(pattern)
              return true
            } catch {
              return false
            }
          }, 'Pattern must be a valid regular expression'),
        capture: z.number().int().nonnegative(),
        transform: extractionTransformSchema.optional(),
      })
      .strict(),
  })
  .strict()

/** @riviere-role value-object */
export class FromFilePathExtractionRule {
  declare private readonly brand: 'FromFilePathExtractionRule'
  readonly kind = 'fromFilePath' as const

  private constructor(
    readonly pattern: string,
    readonly capture: number,
    readonly transform: ExtractionTransform | undefined,
  ) {}

  static parse(input: unknown): RuleParseResult<FromFilePathExtractionRule> {
    return parseRule(
      fromFilePathSchema,
      input,
      ({ fromFilePath }) =>
        new FromFilePathExtractionRule(
          fromFilePath.pattern,
          fromFilePath.capture,
          fromFilePath.transform,
        ),
    )
  }
}

const fromPropertySchema = z
  .object({
    fromProperty: z
      .object({
        name: z.string().min(1),
        kind: z.enum(['static', 'instance']),
        transform: extractionTransformSchema.optional(),
      })
      .strict(),
  })
  .strict()

/** @riviere-role value-object */
export class FromPropertyExtractionRule {
  declare private readonly brand: 'FromPropertyExtractionRule'
  readonly kind = 'fromProperty' as const

  private constructor(
    readonly propertyName: string,
    readonly propertyKind: 'static' | 'instance',
    readonly transform: ExtractionTransform | undefined,
  ) {}

  static parse(input: unknown): RuleParseResult<FromPropertyExtractionRule> {
    return parseRule(
      fromPropertySchema,
      input,
      ({ fromProperty }) =>
        new FromPropertyExtractionRule(
          fromProperty.name,
          fromProperty.kind,
          fromProperty.transform,
        ),
    )
  }
}

const fromDecoratorArgSchema = z
  .object({
    fromDecoratorArg: z.union([
      z
        .object({
          decorator: z.string().min(1).optional(),
          position: z.number().int().nonnegative(),
          transform: extractionTransformSchema.optional(),
        })
        .strict()
        .transform(({ position, ...rule }) => ({
          ...rule,
          argument: { kind: 'position' as const, position },
        })),
      z
        .object({
          decorator: z.string().min(1).optional(),
          name: z.string().min(1),
          transform: extractionTransformSchema.optional(),
        })
        .strict()
        .transform(({ name, ...rule }) => ({
          ...rule,
          argument: { kind: 'name' as const, name },
        })),
    ]),
  })
  .strict()

/** @riviere-role value-object */
export class FromDecoratorArgExtractionRule {
  declare private readonly brand: 'FromDecoratorArgExtractionRule'
  readonly kind = 'fromDecoratorArg' as const

  private constructor(
    readonly decoratorName: string | undefined,
    readonly argument: DecoratorArgumentSelector,
    readonly transform: ExtractionTransform | undefined,
  ) {}

  static parse(input: unknown): RuleParseResult<FromDecoratorArgExtractionRule> {
    return parseRule(
      fromDecoratorArgSchema,
      input,
      ({ fromDecoratorArg }) =>
        new FromDecoratorArgExtractionRule(
          fromDecoratorArg.decorator,
          fromDecoratorArg.argument,
          fromDecoratorArg.transform,
        ),
    )
  }
}

const fromClassDecoratorArgSchema = z
  .object({
    fromClassDecoratorArg: z.union([
      z
        .object({
          decorator: z.string().min(1),
          position: z.number().int().nonnegative(),
          transform: extractionTransformSchema.optional(),
        })
        .strict()
        .transform(({ position, ...rule }) => ({
          ...rule,
          argument: { kind: 'position' as const, position },
        })),
      z
        .object({
          decorator: z.string().min(1),
          name: z.string().min(1),
          transform: extractionTransformSchema.optional(),
        })
        .strict()
        .transform(({ name, ...rule }) => ({
          ...rule,
          argument: { kind: 'name' as const, name },
        })),
    ]),
  })
  .strict()

/** @riviere-role value-object */
export class FromClassDecoratorArgExtractionRule {
  declare private readonly brand: 'FromClassDecoratorArgExtractionRule'
  readonly kind = 'fromClassDecoratorArg' as const

  private constructor(
    readonly decoratorName: string,
    readonly argument: DecoratorArgumentSelector,
    readonly transform: ExtractionTransform | undefined,
  ) {}

  static parse(input: unknown): RuleParseResult<FromClassDecoratorArgExtractionRule> {
    return parseRule(
      fromClassDecoratorArgSchema,
      input,
      ({ fromClassDecoratorArg }) =>
        new FromClassDecoratorArgExtractionRule(
          fromClassDecoratorArg.decorator,
          fromClassDecoratorArg.argument,
          fromClassDecoratorArg.transform,
        ),
    )
  }
}

const fromDecoratorNameSchema = z
  .object({
    fromDecoratorName: z.union([
      z.literal(true),
      z
        .object({
          mapping: z.record(z.string(), z.string()).optional(),
          transform: extractionTransformSchema.optional(),
        })
        .strict(),
    ]),
  })
  .strict()

/** @riviere-role value-object */
export class FromDecoratorNameExtractionRule {
  declare private readonly brand: 'FromDecoratorNameExtractionRule'
  readonly kind = 'fromDecoratorName' as const

  private constructor(
    readonly mapping: Readonly<Record<string, string>> | undefined,
    readonly transform: ExtractionTransform | undefined,
  ) {}

  static parse(input: unknown): RuleParseResult<FromDecoratorNameExtractionRule> {
    return parseRule(
      fromDecoratorNameSchema,
      input,
      ({ fromDecoratorName }) =>
        new FromDecoratorNameExtractionRule(
          fromDecoratorName === true ? undefined : fromDecoratorName.mapping,
          fromDecoratorName === true ? undefined : fromDecoratorName.transform,
        ),
    )
  }
}

const fromGenericArgSchema = z
  .object({
    fromGenericArg: z
      .object({
        interface: z.string().min(1),
        position: z.number().int().nonnegative(),
        transform: extractionTransformSchema.optional(),
      })
      .strict(),
  })
  .strict()

/** @riviere-role value-object */
export class FromGenericArgExtractionRule {
  declare private readonly brand: 'FromGenericArgExtractionRule'
  readonly kind = 'fromGenericArg' as const

  private constructor(
    readonly interfaceName: string,
    readonly position: number,
    readonly transform: ExtractionTransform | undefined,
  ) {}

  static parse(input: unknown): RuleParseResult<FromGenericArgExtractionRule> {
    return parseRule(
      fromGenericArgSchema,
      input,
      ({ fromGenericArg }) =>
        new FromGenericArgExtractionRule(
          fromGenericArg.interface,
          fromGenericArg.position,
          fromGenericArg.transform,
        ),
    )
  }
}

const fromMethodSignatureSchema = z.object({ fromMethodSignature: z.literal(true) }).strict()

/** @riviere-role value-object */
export class FromMethodSignatureExtractionRule {
  declare private readonly brand: 'FromMethodSignatureExtractionRule'
  readonly kind = 'fromMethodSignature' as const

  private constructor() {
    Object.freeze(this)
  }

  static parse(input: unknown): RuleParseResult<FromMethodSignatureExtractionRule> {
    return parseRule(
      fromMethodSignatureSchema,
      input,
      () => new FromMethodSignatureExtractionRule(),
    )
  }
}

const fromConstructorParamsSchema = z.object({ fromConstructorParams: z.literal(true) }).strict()

/** @riviere-role value-object */
export class FromConstructorParamsExtractionRule {
  declare private readonly brand: 'FromConstructorParamsExtractionRule'
  readonly kind = 'fromConstructorParams' as const

  private constructor() {
    Object.freeze(this)
  }

  static parse(input: unknown): RuleParseResult<FromConstructorParamsExtractionRule> {
    return parseRule(
      fromConstructorParamsSchema,
      input,
      () => new FromConstructorParamsExtractionRule(),
    )
  }
}

const fromParameterTypeSchema = z
  .object({
    fromParameterType: z
      .object({
        position: z.number().int().nonnegative(),
        transform: extractionTransformSchema.optional(),
      })
      .strict(),
  })
  .strict()

/** @riviere-role value-object */
export class FromParameterTypeExtractionRule {
  declare private readonly brand: 'FromParameterTypeExtractionRule'
  readonly kind = 'fromParameterType' as const

  private constructor(
    readonly position: number,
    readonly transform: ExtractionTransform | undefined,
  ) {}

  static parse(input: unknown): RuleParseResult<FromParameterTypeExtractionRule> {
    return parseRule(
      fromParameterTypeSchema,
      input,
      ({ fromParameterType }) =>
        new FromParameterTypeExtractionRule(
          fromParameterType.position,
          fromParameterType.transform,
        ),
    )
  }
}

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
