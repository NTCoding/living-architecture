import { z } from 'zod'
import type {
  AndPredicateInput,
  ExtendsClassPredicateInput,
  HasDecoratorPredicateInput,
  HasJSDocPredicateInput,
  ImplementsInterfacePredicateInput,
  InClassWithPredicateInput,
  NameEndsWithPredicateInput,
  NameMatchesPredicateInput,
  OrPredicateInput,
} from './extraction-config-schema'

type PredicateParseResult<T = Predicate> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: readonly string[] }

type PredicateParser = (input: unknown) => PredicateParseResult

function parseValue<TInput, TValue>(
  schema: z.ZodType<TInput>,
  input: unknown,
  createValue: (parsed: TInput) => TValue,
): PredicateParseResult<TValue> {
  const result = schema.safeParse(input)
  return result.success
    ? { success: true, data: createValue(result.data) }
    : { success: false, errors: result.error.issues.map((issue) => issue.message) }
}

const hasDecoratorSchema = z
  .object({
    hasDecorator: z
      .object({
        name: z.union([z.string().min(1), z.array(z.string().min(1)).min(1).readonly()]),
        from: z.string().min(1).optional(),
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<HasDecoratorPredicateInput>

/** @riviere-role value-object */
export class HasDecoratorPredicate {
  declare private readonly brand: 'HasDecoratorPredicate'
  readonly kind = 'hasDecorator' as const

  private constructor(
    readonly decoratorNames: readonly string[],
    readonly fromPackage: string | undefined,
  ) {}

  static parse(input: unknown): PredicateParseResult<HasDecoratorPredicate> {
    return parseValue(
      hasDecoratorSchema,
      input,
      ({ hasDecorator }) =>
        new HasDecoratorPredicate(
          typeof hasDecorator.name === 'string' ? [hasDecorator.name] : hasDecorator.name,
          hasDecorator.from,
        ),
    )
  }
}

const hasJSDocSchema = z
  .object({ hasJSDoc: z.object({ tag: z.string().min(1) }).strict() })
  .strict() satisfies z.ZodType<HasJSDocPredicateInput>

/** @riviere-role value-object */
export class HasJSDocPredicate {
  declare private readonly brand: 'HasJSDocPredicate'
  readonly kind = 'hasJSDoc' as const

  private constructor(readonly tagName: string) {}

  static parse(input: unknown): PredicateParseResult<HasJSDocPredicate> {
    return parseValue(hasJSDocSchema, input, ({ hasJSDoc }) => new HasJSDocPredicate(hasJSDoc.tag))
  }
}

const extendsClassSchema = z
  .object({ extendsClass: z.object({ name: z.string().min(1) }).strict() })
  .strict() satisfies z.ZodType<ExtendsClassPredicateInput>

/** @riviere-role value-object */
export class ExtendsClassPredicate {
  declare private readonly brand: 'ExtendsClassPredicate'
  readonly kind = 'extendsClass' as const

  private constructor(readonly className: string) {}

  static parse(input: unknown): PredicateParseResult<ExtendsClassPredicate> {
    return parseValue(
      extendsClassSchema,
      input,
      ({ extendsClass }) => new ExtendsClassPredicate(extendsClass.name),
    )
  }
}

const implementsInterfaceSchema = z
  .object({ implementsInterface: z.object({ name: z.string().min(1) }).strict() })
  .strict() satisfies z.ZodType<ImplementsInterfacePredicateInput>

/** @riviere-role value-object */
export class ImplementsInterfacePredicate {
  declare private readonly brand: 'ImplementsInterfacePredicate'
  readonly kind = 'implementsInterface' as const

  private constructor(readonly interfaceName: string) {}

  static parse(input: unknown): PredicateParseResult<ImplementsInterfacePredicate> {
    return parseValue(
      implementsInterfaceSchema,
      input,
      ({ implementsInterface }) => new ImplementsInterfacePredicate(implementsInterface.name),
    )
  }
}

const nameEndsWithSchema = z
  .object({ nameEndsWith: z.object({ suffix: z.string().min(1) }).strict() })
  .strict() satisfies z.ZodType<NameEndsWithPredicateInput>

/** @riviere-role value-object */
export class NameEndsWithPredicate {
  declare private readonly brand: 'NameEndsWithPredicate'
  readonly kind = 'nameEndsWith' as const

  private constructor(readonly suffix: string) {}

  static parse(input: unknown): PredicateParseResult<NameEndsWithPredicate> {
    return parseValue(
      nameEndsWithSchema,
      input,
      ({ nameEndsWith }) => new NameEndsWithPredicate(nameEndsWith.suffix),
    )
  }
}

function isRegularExpression(pattern: string): boolean {
  try {
    new RegExp(pattern)
    return true
  } catch {
    return false
  }
}

const nameMatchesSchema = z
  .object({
    nameMatches: z
      .object({
        pattern: z
          .string()
          .min(1)
          .refine(isRegularExpression, 'Pattern must be a valid regular expression'),
      })
      .strict(),
  })
  .strict() satisfies z.ZodType<NameMatchesPredicateInput>

/** @riviere-role value-object */
export class NameMatchesPredicate {
  declare private readonly brand: 'NameMatchesPredicate'
  readonly kind = 'nameMatches' as const

  private constructor(readonly pattern: string) {}

  static parse(input: unknown): PredicateParseResult<NameMatchesPredicate> {
    return parseValue(
      nameMatchesSchema,
      input,
      ({ nameMatches }) => new NameMatchesPredicate(nameMatches.pattern),
    )
  }
}

const inClassWithProperty = 'inClassWith' satisfies keyof InClassWithPredicateInput

const nestedPredicateSchema = z
  .object({ [inClassWithProperty]: z.unknown() })
  .strict()
  .refine(
    (value) => Object.hasOwn(value, inClassWithProperty),
    'inClassWith is required',
  )

/** @riviere-role value-object */
export class InClassWithPredicate {
  declare private readonly brand: 'InClassWithPredicate'
  readonly kind = 'inClassWith' as const

  private constructor(readonly predicate: Predicate) {}

  static parse(input: unknown): PredicateParseResult<InClassWithPredicate> {
    const outer = nestedPredicateSchema.safeParse(input)
    if (!outer.success) {
      return { success: false, errors: outer.error.issues.map((issue) => issue.message) }
    }
    const nested = parsePredicate(outer.data.inClassWith)
    return nested.success ? { success: true, data: new InClassWithPredicate(nested.data) } : nested
  }
}

const andProperty = 'and' satisfies keyof AndPredicateInput
const andPredicateSchema = z.object({ [andProperty]: z.array(z.unknown()).min(2) }).strict()

/** @riviere-role value-object */
export class AndPredicate {
  declare private readonly brand: 'AndPredicate'
  readonly kind = 'and' as const

  private constructor(readonly predicates: readonly Predicate[]) {}

  static parse(input: unknown): PredicateParseResult<AndPredicate> {
    const outer = andPredicateSchema.safeParse(input)
    if (!outer.success) {
      return { success: false, errors: outer.error.issues.map((issue) => issue.message) }
    }
    const predicates = parsePredicates(outer.data.and)
    return predicates.success
      ? { success: true, data: new AndPredicate(predicates.data) }
      : predicates
  }
}

const orProperty = 'or' satisfies keyof OrPredicateInput
const orPredicateSchema = z.object({ [orProperty]: z.array(z.unknown()).min(2) }).strict()

/** @riviere-role value-object */
export class OrPredicate {
  declare private readonly brand: 'OrPredicate'
  readonly kind = 'or' as const

  private constructor(readonly predicates: readonly Predicate[]) {}

  static parse(input: unknown): PredicateParseResult<OrPredicate> {
    const outer = orPredicateSchema.safeParse(input)
    if (!outer.success) {
      return { success: false, errors: outer.error.issues.map((issue) => issue.message) }
    }
    const predicates = parsePredicates(outer.data.or)
    return predicates.success
      ? { success: true, data: new OrPredicate(predicates.data) }
      : predicates
  }
}

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

const predicateParsers = {
  hasDecorator: HasDecoratorPredicate.parse,
  hasJSDoc: HasJSDocPredicate.parse,
  extendsClass: ExtendsClassPredicate.parse,
  implementsInterface: ImplementsInterfacePredicate.parse,
  nameEndsWith: NameEndsWithPredicate.parse,
  nameMatches: NameMatchesPredicate.parse,
  inClassWith: InClassWithPredicate.parse,
  and: AndPredicate.parse,
  or: OrPredicate.parse,
} satisfies Readonly<Record<Predicate['kind'], PredicateParser>>

function parsePredicates(inputs: readonly unknown[]): PredicateParseResult<readonly Predicate[]> {
  const predicates: Predicate[] = []
  const errors: string[] = []
  for (const input of inputs) {
    const parsed = parsePredicate(input)
    if (parsed.success) predicates.push(parsed.data)
    else errors.push(...parsed.errors)
  }
  return errors.length === 0 ? { success: true, data: predicates } : { success: false, errors }
}

const predicateObjectSchema = z.record(z.string(), z.unknown())

function parsePredicate(input: unknown): PredicateParseResult {
  const object = predicateObjectSchema.safeParse(input)
  if (!object.success) {
    return { success: false, errors: object.error.issues.map((issue) => issue.message) }
  }
  const keys = Object.keys(object.data)
  if (keys.length !== 1) return { success: false, errors: ['Expected one predicate'] }
  const errors: string[] = []
  for (const parse of Object.values(predicateParsers)) {
    const result = parse(input)
    if (result.success) return result
    errors.push(...result.errors)
  }
  return { success: false, errors }
}
