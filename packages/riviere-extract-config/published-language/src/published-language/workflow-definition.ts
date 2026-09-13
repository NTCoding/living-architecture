import { z } from 'zod'
import {
  SYSTEM_TYPES,
  type DomainMetadata,
  type SourceInfo,
} from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role published-language-enumeration */
export const WORKFLOW_STAGE_KINDS = [
  'code-extraction',
  'eventcatalog-import',
  'asyncapi-import',
  'ai-extract',
  'ai-enrich',
  'schema-validate',
] as const

/** @riviere-role published-language-enumeration-type */
export type WorkflowStageKind = (typeof WORKFLOW_STAGE_KINDS)[number]

/** @riviere-role published-language-data-structure */
export interface ConfiguredWorkflowStageDefinition {
  readonly kind: Exclude<WorkflowStageKind, 'schema-validate'>
  readonly name: string
  readonly config: string
}

/** @riviere-role published-language-data-structure */
export interface SchemaValidateWorkflowStageDefinition {
  readonly kind: 'schema-validate'
  readonly name: string
}

/** @riviere-role published-language-union */
export type WorkflowStageDefinition =
  | ConfiguredWorkflowStageDefinition
  | SchemaValidateWorkflowStageDefinition

/** @riviere-role published-language-schema */
export interface WorkflowDefinition {
  readonly apiVersion: 'v1'
  readonly name: string
  readonly description?: string
  readonly output: string
  readonly sources: readonly SourceInfo[]
  readonly domains: Readonly<Record<string, DomainMetadata>>
  readonly stages: readonly WorkflowStageDefinition[]
}

const nonEmptyString = z.string().trim().min(1)

const sourceSchema = z.strictObject({
  name: nonEmptyString.optional(),
  repository: nonEmptyString,
})

const domainSchema = z.strictObject({
  description: nonEmptyString,
  systemType: z.enum(SYSTEM_TYPES).optional(),
})

const domainsSchema = z.record(z.string(), domainSchema).refine(
  (domains) => {
    const names = Object.keys(domains)
    return names.length >= 1 && names.every((name) => name.trim().length >= 1)
  },
  { message: 'domains must be a non-empty object with non-empty names' },
)

const configuredStageSchema = z.strictObject({
  name: nonEmptyString,
  kind: z.enum(WORKFLOW_STAGE_KINDS).refine((kind) => kind !== 'schema-validate', {
    message:
      "kind must be one of 'code-extraction', 'eventcatalog-import', 'asyncapi-import', 'ai-extract', 'ai-enrich'",
  }),
  config: nonEmptyString,
})

const schemaValidateStageSchema = z.strictObject({
  name: nonEmptyString,
  kind: z.literal('schema-validate'),
})

const stagesSchema = z
  .array(z.union([configuredStageSchema, schemaValidateStageSchema]))
  .min(1)
  .refine((stages) => new Set(stages.map((stage) => stage.name)).size === stages.length, {
    message: 'workflow stage names must be unique',
  })

const workflowDefinitionSchema = z
  .strictObject({
    apiVersion: z.literal('v1'),
    name: nonEmptyString,
    description: nonEmptyString.optional(),
    output: nonEmptyString,
    sources: z.array(sourceSchema).min(1),
    domains: domainsSchema,
    stages: stagesSchema,
  })
  .transform((definition) => ({
    apiVersion: definition.apiVersion,
    name: definition.name,
    ...(definition.description === undefined ? {} : { description: definition.description }),
    output: definition.output,
    sources: definition.sources,
    domains: Object.fromEntries(
      Object.entries(definition.domains).map(([name, domain]) => [
        name,
        { description: domain.description, systemType: domain.systemType ?? 'domain' },
      ]),
    ),
    stages: definition.stages,
  }))

/** @riviere-role published-language-parser */
export function parseWorkflowDefinition(
  value: unknown,
):
  | { success: true; definition: WorkflowDefinition }
  | { success: false; issues: readonly string[] } {
  const result = workflowDefinitionSchema.safeParse(value)
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
    definition: result.data,
  }
}
