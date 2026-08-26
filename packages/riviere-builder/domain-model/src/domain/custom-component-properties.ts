import { ExistingValuePreference } from './existing-value-preference'

type Primitive = string | number | boolean
type ScalarReplacement = Readonly<{
  field: string
  oldValue: Primitive
  newValue: Primitive
}>

type CustomPropertyCombination = Readonly<{
  properties: CustomComponentProperties
  replacements: readonly ScalarReplacement[]
}>

/** @riviere-role value-object */
export class CustomComponentProperties {
  declare private readonly brand: 'CustomComponentProperties'

  private constructor(private readonly value: Readonly<Record<string, unknown>>) {}

  static parse(value: Readonly<Record<string, unknown>> | undefined): CustomComponentProperties {
    return new CustomComponentProperties(value ?? {})
  }

  including(
    incoming: CustomComponentProperties,
    preference: ExistingValuePreference,
  ): CustomPropertyCombination {
    const replacements: ScalarReplacement[] = []
    const value = combineRecords(this.value, incoming.value, preference, 'metadata', replacements)
    return { properties: new CustomComponentProperties(value), replacements }
  }

  published(): Readonly<Record<string, unknown>> {
    return this.value
  }
}

function combineRecords(
  existing: Readonly<Record<string, unknown>>,
  incoming: Readonly<Record<string, unknown>>,
  preference: ExistingValuePreference,
  path: string,
  replacements: ScalarReplacement[],
): Readonly<Record<string, unknown>> {
  const combined: Record<string, unknown> = { ...existing }
  for (const [field, incomingValue] of Object.entries(incoming)) {
    applyIncomingProperty(combined, field, incomingValue, preference, path, replacements)
  }
  return combined
}

function applyIncomingProperty(
  combined: Record<string, unknown>,
  field: string,
  incomingValue: unknown,
  preference: ExistingValuePreference,
  path: string,
  replacements: ScalarReplacement[],
): void {
  if (incomingValue === undefined || incomingValue === null) return
  const existingValue = combined[field]
  if (Array.isArray(incomingValue)) {
    combined[field] = uniqueValues(Array.isArray(existingValue) ? existingValue : [], incomingValue)
    return
  }
  if (isRecord(incomingValue)) {
    combined[field] = combineRecords(
      isRecord(existingValue) ? existingValue : {},
      incomingValue,
      preference,
      `${path}.${field}`,
      replacements,
    )
    return
  }
  const selected = preference.valueAfterUpdate(existingValue, incomingValue)
  if (
    isPrimitive(existingValue) &&
    isPrimitive(incomingValue) &&
    selected === incomingValue &&
    existingValue !== incomingValue
  ) {
    replacements.push({
      field: `${path}.${field}`,
      oldValue: existingValue,
      newValue: incomingValue,
    })
  }
  combined[field] = selected
}

function uniqueValues(
  existing: readonly unknown[],
  incoming: readonly unknown[],
): readonly unknown[] {
  const known = new Set(existing.map(stableValue))
  return [
    ...existing,
    ...incoming.filter((value) => {
      const identity = stableValue(value)
      if (known.has(identity)) return false
      known.add(identity)
      return true
    }),
  ]
}

function stableValue(value: unknown): string {
  return isPrimitive(value) ? `${typeof value}:${String(value)}` : `json:${JSON.stringify(value)}`
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPrimitive(value: unknown): value is Primitive {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}
