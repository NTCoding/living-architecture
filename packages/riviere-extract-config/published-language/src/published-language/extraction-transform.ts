import { z } from 'zod'
import type { ExtractionTransformInput } from './extraction-config-schema'

type ExtractionTransformParseResult =
  | { readonly success: true; readonly data: ExtractionTransform }
  | { readonly success: false; readonly errors: readonly string[] }

const extractionTransformInputSchema: z.ZodType<ExtractionTransformInput> = z
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

function removeSuffix(value: string, suffix: string): string {
  return value.endsWith(suffix) ? value.slice(0, -suffix.length) : value
}

function removePrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value
}

function convertKebabToPascal(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function convertPascalToKebab(value: string): string {
  const converted = value.replaceAll(/([A-Z])/g, '-$1').toLowerCase()
  return converted.startsWith('-') ? converted.slice(1) : converted
}

/** @riviere-role value-object */
export class ExtractionTransform {
  declare private readonly brand: 'ExtractionTransform'

  private constructor(private readonly values: Readonly<ExtractionTransformInput>) {}

  static parse(input: unknown): ExtractionTransformParseResult {
    const result = extractionTransformInputSchema.safeParse(input)
    return result.success
      ? { success: true, data: new ExtractionTransform(result.data) }
      : { success: false, errors: result.error.issues.map((issue) => issue.message) }
  }

  applyTo(sourceText: string): string {
    const withoutSuffix =
      this.values.stripSuffix === undefined
        ? sourceText
        : removeSuffix(sourceText, this.values.stripSuffix)
    const withoutPrefix =
      this.values.stripPrefix === undefined
        ? withoutSuffix
        : removePrefix(withoutSuffix, this.values.stripPrefix)
    const lowerCased = this.values.toLowerCase === true ? withoutPrefix.toLowerCase() : withoutPrefix
    const upperCased = this.values.toUpperCase === true ? lowerCased.toUpperCase() : lowerCased
    const pascalCased =
      this.values.kebabToPascal === true ? convertKebabToPascal(upperCased) : upperCased
    return this.values.pascalToKebab === true
      ? convertPascalToKebab(pascalCased)
      : pascalCased
  }
}
