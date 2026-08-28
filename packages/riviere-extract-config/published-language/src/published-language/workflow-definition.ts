import { z } from 'zod'
import type {
  DomainMetadata,
  SourceInfo,
} from '@living-architecture/riviere-schema-published-language/schema'

/** @riviere-role published-language-data-structure */
export interface WorkflowGraphDefinition {
  readonly name?: string
  readonly description?: string
  readonly sources: readonly SourceInfo[]
  readonly domains: Readonly<Record<string, DomainMetadata>>
  readonly outputPath: string
}

/** @riviere-role published-language-data-structure */
export interface WorkflowRunLogDefinition {
  readonly directory: string
}

/** @riviere-role published-language-data-structure */
export interface WorkflowExtractStageDefinition {
  readonly kind: 'extract'
  readonly name: string
  readonly configPath: string
  readonly useTsConfig: boolean
}

/** @riviere-role published-language-data-structure */
export interface WorkflowLinkStageDefinition {
  readonly kind: 'link'
  readonly name: 'link'
  readonly configPath: string
  readonly useTsConfig: boolean
}

/** @riviere-role published-language-data-structure */
export interface WorkflowValidateStageDefinition {
  readonly kind: 'validate'
  readonly name: 'validate'
}

/** @riviere-role published-language-union */
export type WorkflowStageDefinition =
  | WorkflowExtractStageDefinition
  | WorkflowLinkStageDefinition
  | WorkflowValidateStageDefinition

/** @riviere-role published-language-schema */
export interface WorkflowDefinition {
  readonly version: 1
  readonly graph: WorkflowGraphDefinition
  readonly runLog: WorkflowRunLogDefinition
  readonly stages: readonly WorkflowStageDefinition[]
}

/** @riviere-role published-language-data-structure */
export interface WorkflowDefinitionParseSuccess {
  readonly success: true
  readonly definition: WorkflowDefinition
}

/** @riviere-role published-language-data-structure */
export interface WorkflowDefinitionParseFailure {
  readonly success: false
  readonly issues: readonly string[]
}

/** @riviere-role published-language-union */
export type WorkflowDefinitionParseResult =
  | WorkflowDefinitionParseSuccess
  | WorkflowDefinitionParseFailure

const nonEmptyString = z.string().trim().min(1)
const systemType = z.enum(['domain', 'bff', 'ui', 'external-service', 'other'])
const graphSchema = z
  .strictObject({
    name: nonEmptyString.optional(),
    description: nonEmptyString.optional(),
    sources: z
      .array(
        z.strictObject({
          name: nonEmptyString.optional(),
          repository: nonEmptyString,
        }),
      )
      .min(1),
    domains: z
      .array(
        z.strictObject({
          name: nonEmptyString,
          description: nonEmptyString.optional(),
          systemType: systemType.optional(),
        }),
      )
      .min(1),
    outputPath: nonEmptyString,
  })
  .transform(
    (graph): WorkflowGraphDefinition => ({
      ...(graph.name === undefined ? {} : { name: graph.name }),
      ...(graph.description === undefined ? {} : { description: graph.description }),
      sources: graph.sources.map((source) => ({ repository: source.repository })),
      domains: Object.fromEntries(
        graph.domains.map((domain) => [
          domain.name,
          {
            description: domain.description ?? `${domain.name} domain`,
            systemType: domain.systemType ?? 'domain',
          },
        ]),
      ),
      outputPath: graph.outputPath,
    }),
  )

const stageSchema = z.union([
  z
    .strictObject({
      extract: z.strictObject({
        name: nonEmptyString,
        config: nonEmptyString,
        useTsConfig: z.boolean().optional(),
      }),
    })
    .transform(
      ({ extract }): WorkflowExtractStageDefinition => ({
        kind: 'extract',
        name: extract.name,
        configPath: extract.config,
        useTsConfig: extract.useTsConfig ?? true,
      }),
    ),
  z
    .strictObject({
      link: z.strictObject({
        config: nonEmptyString,
        useTsConfig: z.boolean().optional(),
      }),
    })
    .transform(
      ({ link }): WorkflowLinkStageDefinition => ({
        kind: 'link',
        name: 'link',
        configPath: link.config,
        useTsConfig: link.useTsConfig ?? true,
      }),
    ),
  z
    .strictObject({ validate: z.strictObject({}) })
    .transform((): WorkflowValidateStageDefinition => ({ kind: 'validate', name: 'validate' })),
])

const workflowDefinitionSchema: z.ZodType<WorkflowDefinition> = z.strictObject({
  version: z.literal(1),
  graph: graphSchema,
  runLog: z.strictObject({ directory: nonEmptyString }),
  stages: z.array(stageSchema).min(1),
})

/** @riviere-role published-language-parser */
export function parseWorkflowDefinition(
  value: unknown,
):
  | { readonly success: true; readonly definition: WorkflowDefinition }
  | { readonly success: false; readonly issues: readonly string[] } {
  const result = workflowDefinitionSchema.safeParse(value)
  if (!result.success)
    return {
      success: false,
      issues: result.error.issues.map(
        (issue) => `${issue.path.length === 0 ? '/' : issue.path.join('.')}: ${issue.message}`,
      ),
    }
  return { success: true, definition: result.data }
}
