import type { ExtractionTransform } from '@living-architecture/riviere-extract-config-published-language'

function stripSuffix(value: string, suffix: string): string {
  if (value.endsWith(suffix)) {
    return value.slice(0, -suffix.length)
  }
  return value
}

function stripPrefix(value: string, prefix: string): string {
  if (value.startsWith(prefix)) {
    return value.slice(prefix.length)
  }
  return value
}

function toLowerCase(value: string): string {
  return value.toLowerCase()
}

function toUpperCase(value: string): string {
  return value.toUpperCase()
}

function kebabToPascal(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function pascalToKebab(value: string): string {
  const transformed = value.replaceAll(/([A-Z])/g, '-$1').toLowerCase()
  return transformed.startsWith('-') ? transformed.slice(1) : transformed
}

type TransformFn = (value: string) => string

/**
 * @riviere-role domain-service
 * @riviere-role-justification TODO: Added before justification rule introduced.
 */
export function applyTransforms(value: string, transform: ExtractionTransform): string {
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
