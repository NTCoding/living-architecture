import { InvalidCustomPropertyError } from '../errors/errors'

export function parseCustomProperties(
  properties: string[] | undefined,
): Record<string, string> | undefined {
  if (!properties || properties.length === 0) {
    return undefined
  }
  const metadata: Record<string, string> = {}
  for (const prop of properties) {
    const colonIndex = prop.indexOf(':')
    if (colonIndex === -1) {
      throw new InvalidCustomPropertyError(prop)
    }
    const key = prop.slice(0, colonIndex)
    const value = prop.slice(colonIndex + 1)
    metadata[key] = value
  }
  return metadata
}
