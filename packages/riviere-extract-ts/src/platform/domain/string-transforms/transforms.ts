import type { Transform } from '@living-architecture/riviere-extract-config'

export function stripSuffix(value: string, suffix: string): string {
  if (value.endsWith(suffix)) {
    return value.slice(0, -suffix.length)
  }
  return value
}

export function stripPrefix(value: string, prefix: string): string {
  if (value.startsWith(prefix)) {
    return value.slice(prefix.length)
  }
  return value
}

export function toLowerCase(value: string): string {
  return value.toLowerCase()
}

export function toUpperCase(value: string): string {
  return value.toUpperCase()
}

export function kebabToPascal(value: string): string {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

export function pascalToKebab(value: string): string {
  const transformed = value.replaceAll(/([A-Z])/g, '-$1').toLowerCase()
  return transformed.startsWith('-') ? transformed.slice(1) : transformed
}

type TransformFn = (value: string) => string

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
