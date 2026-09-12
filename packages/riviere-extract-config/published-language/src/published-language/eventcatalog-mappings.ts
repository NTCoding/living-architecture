import { z } from 'zod'

/** @riviere-role published-language-enumeration */
export const EVENT_CATALOG_SERVICE_COMPONENT_TYPES = ['UseCase'] as const

/** @riviere-role published-language-enumeration-type */
export type EventCatalogServiceComponentType =
  (typeof EVENT_CATALOG_SERVICE_COMPONENT_TYPES)[number]

/** @riviere-role published-language-data-structure */
export interface EventCatalogServiceMapping {
  readonly type: EventCatalogServiceComponentType
  readonly domain?: string | undefined
  readonly module: string
  readonly name: string
}

/** @riviere-role published-language-data-structure */
export interface EventCatalogEventMapping {
  readonly name: string
  readonly domain?: string | undefined
  readonly module?: string | undefined
}

/** @riviere-role published-language-schema */
export interface EventCatalogMappings {
  readonly domains: Readonly<Record<string, string>>
  readonly services: Readonly<Record<string, EventCatalogServiceMapping>>
  readonly events: Readonly<Record<string, EventCatalogEventMapping>>
}

const nonEmptyString = z.string().trim().min(1)

const serviceMappingSchema = z.strictObject({
  type: z.enum(EVENT_CATALOG_SERVICE_COMPONENT_TYPES),
  domain: nonEmptyString.optional(),
  module: nonEmptyString,
  name: nonEmptyString,
})

const eventMappingSchema = z.strictObject({
  name: nonEmptyString,
  domain: nonEmptyString.optional(),
  module: nonEmptyString.optional(),
})

const mappingsSchema = z.strictObject({
  domains: z.record(nonEmptyString, nonEmptyString).default({}),
  services: z.record(nonEmptyString, serviceMappingSchema).default({}),
  events: z.record(nonEmptyString, eventMappingSchema).default({}),
})

/** @riviere-role published-language-parser */
export function parseEventCatalogMappings(
  value: unknown,
):
  | { success: true; mappings: EventCatalogMappings }
  | { success: false; issues: readonly string[] } {
  const result = mappingsSchema.safeParse(value)
  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map(
        (issue) => `${issue.path.length === 0 ? '/' : issue.path.join('.')}: ${issue.message}`,
      ),
    }
  }
  return {
    success: true,
    mappings: result.data,
  }
}
