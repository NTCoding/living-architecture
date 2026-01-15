import type { Transform } from '@living-architecture/riviere-extract-config'

/**
 * Removes a suffix from a string if present.
 */
export function stripSuffix(value: string, suffix: string): string {
  if (value.endsWith(suffix)) {
    return value.slice(0, -suffix.length)
  }
  return value
}

/**
 * Removes a prefix from a string if present.
 */
export function stripPrefix(value: string, prefix: string): string {
  if (value.startsWith(prefix)) {
    return value.slice(prefix.length)
  }
  return value
}

/**
 * Converts a string to lowercase.
 */
export function toLowerCase(value: string): string {
  return value.toLowerCase()
}

/**
 * Converts a string to uppercase.
 */
export function toUpperCase(value: string): string {
  return value.toUpperCase()
}

/**
 * Converts kebab-case to PascalCase.
 * @example 'order-placed' -> 'OrderPlaced'
 */
export function kebabToPascal(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

/**
 * Converts PascalCase to kebab-case.
 * @example 'OrderPlaced' -> 'order-placed'
 */
export function pascalToKebab(value: string): string {
  const transformed = value.replaceAll(/([A-Z])/g, '-$1').toLowerCase()
  return transformed.startsWith('-') ? transformed.slice(1) : transformed
}

type TransformFn = (value: string) => string

/**
 * Applies transforms to a value in order defined in the Transform object.
 * Transforms execute top-to-bottom in YAML order.
 */
export function applyTransforms(value: string, transform: Transform): string {
  const transformers: TransformFn[] = []

  if (transform.stripSuffix !== undefined) {
    const suffix = transform.stripSuffix
    transformers.push((v) => stripSuffix(v, suffix))
  }
  if (transform.stripPrefix !== undefined) {
    const prefix = transform.stripPrefix
    transformers.push((v) => stripPrefix(v, prefix))
  }
  if (transform.toLowerCase === true) {
    transformers.push(toLowerCase)
  }
  if (transform.toUpperCase === true) {
    transformers.push(toUpperCase)
  }
  if (transform.kebabToPascal === true) {
    transformers.push(kebabToPascal)
  }
  if (transform.pascalToKebab === true) {
    transformers.push(pascalToKebab)
  }

  return transformers.reduce((acc, fn) => fn(acc), value)
}
