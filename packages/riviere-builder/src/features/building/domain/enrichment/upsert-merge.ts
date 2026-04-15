import type {
  Component,
  CustomComponent,
  OperationBehavior,
} from '@living-architecture/riviere-schema'
import type { UpsertOptions } from '../construction/construction-types'
import type { BuilderWarning } from '../inspection/inspection-types'
import { mergeBehavior } from './merge-behavior'

type Primitive = string | number | boolean

const IDENTITY_FIELDS = new Set(['id', 'type', 'name', 'domain', 'module'])
const CUSTOM_BASE_FIELDS = new Set([
  'id',
  'type',
  'customTypeName',
  'name',
  'domain',
  'module',
  'description',
  'sourceLocation',
])

/** @riviere-role domain-service */
export function mergeComponentForUpsert<T extends Component>(
  existing: T,
  incoming: T,
  options: UpsertOptions | undefined,
  warnings: BuilderWarning[],
): T {
  const merged: T = { ...existing }

  for (const [field, incomingValue] of Object.entries(incoming)) {
    if (shouldSkipTopLevelField(field, incomingValue)) {
      continue
    }

    mergeTopLevelField(merged, existing.id, field, incomingValue, options, warnings)
  }

  if (isCustomComponent(existing) && isCustomComponent(incoming)) {
    const mergedMetadata = mergeCustomMetadata(existing, incoming, options, warnings)
    for (const [key, value] of Object.entries(mergedMetadata)) {
      setField(merged, key, value)
    }
  }

  return merged
}

function mergeTopLevelField(
  target: object,
  componentId: string,
  field: string,
  incomingValue: unknown,
  options: UpsertOptions | undefined,
  warnings: BuilderWarning[],
): void {
  if (Array.isArray(incomingValue)) {
    mergeArrayField(target, field, incomingValue)
    return
  }

  if (field === 'behavior' && isRecord(incomingValue)) {
    mergeBehaviorField(target, incomingValue)
    return
  }

  if (isRecord(incomingValue) && shouldRecursivelyMergeTopLevelObject(field)) {
    const existingValue = getField(target, field)
    const existingRecord = isRecord(existingValue) ? existingValue : undefined
    setField(
      target,
      field,
      mergeNestedObject(existingRecord, incomingValue, options, warnings, componentId, field),
    )
    return
  }

  mergeScalarLikeField(target, field, incomingValue, options, warnings, componentId)
}

function mergeCustomMetadata(
  existing: CustomComponent,
  incoming: CustomComponent,
  options: UpsertOptions | undefined,
  warnings: BuilderWarning[],
): Record<string, unknown> {
  const existingMetadata = extractCustomMetadata(existing)
  const incomingMetadata = extractCustomMetadata(incoming)

  return mergeNestedObject(
    existingMetadata,
    incomingMetadata,
    options,
    warnings,
    existing.id,
    'metadata',
  )
}

function extractCustomMetadata(component: CustomComponent): Record<string, unknown> {
  const metadata: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(component)) {
    if (CUSTOM_BASE_FIELDS.has(key)) {
      continue
    }

    metadata[key] = value
  }

  return metadata
}

function shouldSkipTopLevelField(field: string, value: unknown): boolean {
  return IDENTITY_FIELDS.has(field) || !isDefined(value)
}

function shouldRecursivelyMergeTopLevelObject(field: string): boolean {
  return field !== 'sourceLocation' && field !== 'signature'
}

function mergeArrayField(target: object, field: string, incomingValue: readonly unknown[]): void {
  if (incomingValue.length === 0) {
    return
  }

  const existingValue = getField(target, field)
  const existingArray = Array.isArray(existingValue) ? existingValue : []
  setField(target, field, mergeArrayUnion(existingArray, incomingValue))
}

function mergeBehaviorField(target: object, incomingValue: Record<string, unknown>): void {
  const existingValue = getField(target, 'behavior')
  const existingBehavior = toOperationBehavior(existingValue)
  const incomingBehavior = toOperationBehaviorFromRecord(incomingValue)

  setField(target, 'behavior', mergeBehavior(existingBehavior, incomingBehavior))
}

function mergeScalarLikeField(
  target: object,
  field: string,
  incomingValue: unknown,
  options: UpsertOptions | undefined,
  warnings: BuilderWarning[],
  componentId: string,
): void {
  const existingValue = getField(target, field)

  if (options?.noOverwrite && isDefined(existingValue)) {
    return
  }

  maybePushScalarOverwriteWarning(warnings, componentId, field, existingValue, incomingValue)

  setField(target, field, incomingValue)
}

function maybePushScalarOverwriteWarning(
  warnings: BuilderWarning[],
  componentId: string,
  field: string,
  existingValue: unknown,
  incomingValue: unknown,
): void {
  if (
    !isPrimitive(existingValue) ||
    !isPrimitive(incomingValue) ||
    existingValue === incomingValue
  ) {
    return
  }

  warnings.push({
    code: 'SCALAR_OVERWRITE',
    message: `Scalar field '${field}' on component '${componentId}' overwritten`,
    componentId,
    field,
    oldValue: existingValue,
    newValue: incomingValue,
  })
}

function mergeNestedObject(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown>,
  options: UpsertOptions | undefined,
  warnings: BuilderWarning[],
  componentId: string,
  pathPrefix: string,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(existing ?? {}) }

  for (const [field, incomingValue] of Object.entries(incoming)) {
    if (!isDefined(incomingValue)) {
      continue
    }

    if (Array.isArray(incomingValue)) {
      mergeArrayField(merged, field, incomingValue)
      continue
    }

    if (isRecord(incomingValue)) {
      const existingValue = merged[field]
      const existingRecord = isRecord(existingValue) ? existingValue : undefined
      merged[field] = mergeNestedObject(
        existingRecord,
        incomingValue,
        options,
        warnings,
        componentId,
        `${pathPrefix}.${field}`,
      )
      continue
    }

    if (options?.noOverwrite && isDefined(merged[field])) {
      continue
    }

    maybePushScalarOverwriteWarning(
      warnings,
      componentId,
      `${pathPrefix}.${field}`,
      merged[field],
      incomingValue,
    )

    merged[field] = incomingValue
  }

  return merged
}

function toOperationBehavior(value: unknown): OperationBehavior | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  return toOperationBehaviorFromRecord(value)
}

function toOperationBehaviorFromRecord(value: Record<string, unknown>): OperationBehavior {
  const behavior: OperationBehavior = {}

  const reads = toStringArray(value['reads'])
  if (reads !== undefined) {
    behavior.reads = reads
  }

  const validates = toStringArray(value['validates'])
  if (validates !== undefined) {
    behavior.validates = validates
  }

  const modifies = toStringArray(value['modifies'])
  if (modifies !== undefined) {
    behavior.modifies = modifies
  }

  const emits = toStringArray(value['emits'])
  if (emits !== undefined) {
    behavior.emits = emits
  }

  return behavior
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value.filter(isString)
}

function mergeArrayUnion<T>(existing: readonly T[], incoming: readonly T[]): T[] {
  const merged = [...existing]
  const seen = new Set(existing.map((item) => toStableKey(item)))

  for (const item of incoming) {
    const key = toStableKey(item)
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    merged.push(item)
  }

  return merged
}

function getField(target: object, field: string): unknown {
  return Reflect.get(target, field)
}

function setField(target: object, field: string, value: unknown): void {
  Reflect.set(target, field, value)
}

function toStableKey(value: unknown): string {
  if (isPrimitive(value)) {
    return `${typeof value}:${String(value)}`
  }

  return `json:${JSON.stringify(value)}`
}

function isDefined(value: unknown): boolean {
  return value !== undefined && value !== null
}

function isPrimitive(value: unknown): value is Primitive {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isCustomComponent(component: Component): component is CustomComponent {
  return component.type === 'Custom'
}
