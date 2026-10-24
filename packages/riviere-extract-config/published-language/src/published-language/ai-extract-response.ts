import { z } from 'zod'

const nonEmptyString = z.string().trim().min(1)

const responseSourceLocationSchema = z.strictObject({
  repository: nonEmptyString,
  filePath: nonEmptyString,
})

const componentDraftBase = {
  name: nonEmptyString,
  domain: nonEmptyString,
  module: nonEmptyString,
  description: nonEmptyString.optional(),
  sourceLocation: responseSourceLocationSchema.optional(),
}

const uiComponentDraftSchema = z.strictObject({
  type: z.literal('UI'),
  ...componentDraftBase,
  route: nonEmptyString,
})

const apiComponentDraftSchema = z.strictObject({
  type: z.literal('API'),
  ...componentDraftBase,
  apiType: z.enum(['REST', 'GraphQL', 'other']),
  httpMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional(),
  path: nonEmptyString.optional(),
  operationName: nonEmptyString.optional(),
})

const useCaseComponentDraftSchema = z.strictObject({
  type: z.literal('UseCase'),
  ...componentDraftBase,
})

const domainOpComponentDraftSchema = z.strictObject({
  type: z.literal('DomainOp'),
  ...componentDraftBase,
  operationName: nonEmptyString,
  entity: nonEmptyString.optional(),
  signature: z
    .strictObject({
      parameters: z
        .array(
          z.strictObject({
            name: nonEmptyString,
            type: nonEmptyString,
            description: nonEmptyString.optional(),
          }),
        )
        .min(1)
        .optional(),
      returnType: nonEmptyString.optional(),
    })
    .optional(),
  behavior: z
    .strictObject({
      reads: z.array(nonEmptyString).min(1).optional(),
      validates: z.array(nonEmptyString).min(1).optional(),
      modifies: z.array(nonEmptyString).min(1).optional(),
      emits: z.array(nonEmptyString).min(1).optional(),
    })
    .optional(),
  stateChanges: z
    .array(
      z.strictObject({
        from: nonEmptyString,
        to: nonEmptyString,
        trigger: nonEmptyString.optional(),
      }),
    )
    .min(1)
    .optional(),
  businessRules: z.array(nonEmptyString).min(1).optional(),
})

const eventComponentDraftSchema = z.strictObject({
  type: z.literal('Event'),
  ...componentDraftBase,
  eventName: nonEmptyString,
  eventSchema: nonEmptyString.optional(),
})

const eventHandlerComponentDraftSchema = z.strictObject({
  type: z.literal('EventHandler'),
  ...componentDraftBase,
  subscribedEvents: z.array(nonEmptyString).min(1),
})

const customComponentDraftSchema = z.strictObject({
  type: z.literal('Custom'),
  ...componentDraftBase,
  customTypeName: nonEmptyString,
})

const componentDraftSchema = z.discriminatedUnion('type', [
  uiComponentDraftSchema,
  apiComponentDraftSchema,
  useCaseComponentDraftSchema,
  domainOpComponentDraftSchema,
  eventComponentDraftSchema,
  eventHandlerComponentDraftSchema,
  customComponentDraftSchema,
])

const internalLinkEntrySchema = z.strictObject({
  source: nonEmptyString,
  target: nonEmptyString,
  type: z.enum(['sync', 'async']).optional(),
  relationshipType: nonEmptyString.optional(),
  condition: nonEmptyString.optional(),
  payload: nonEmptyString.optional(),
  sourceLocation: responseSourceLocationSchema.optional(),
})

const aiExtractResponseSchema = z.strictObject({
  components: z.array(componentDraftSchema),
  links: z.array(internalLinkEntrySchema),
})

/** @riviere-role published-language-union */
export type AiExtractComponentDraft =
  | z.infer<typeof uiComponentDraftSchema>
  | z.infer<typeof apiComponentDraftSchema>
  | z.infer<typeof useCaseComponentDraftSchema>
  | z.infer<typeof domainOpComponentDraftSchema>
  | z.infer<typeof eventComponentDraftSchema>
  | z.infer<typeof eventHandlerComponentDraftSchema>
  | z.infer<typeof customComponentDraftSchema>

/** @riviere-role published-language-data-structure */
export type AiExtractInternalLinkEntry = z.infer<typeof internalLinkEntrySchema>

/** @riviere-role published-language-schema */
export type AiExtractResponse = z.infer<typeof aiExtractResponseSchema>

function parseJson(
  output: string,
): { success: true; value: unknown } | { success: false; reason: string } {
  try {
    return { success: true, value: JSON.parse(output) }
  } catch (error) {
    return { success: false, reason: String(error) }
  }
}

/** @riviere-role published-language-parser */
export function parseAiExtractResponse(
  output: string,
): { success: true; response: AiExtractResponse } | { success: false; issues: readonly string[] } {
  const parsed = parseJson(output)
  if (!parsed.success) {
    return { success: false, issues: [`Response is not valid JSON: ${parsed.reason}`] }
  }
  const result = aiExtractResponseSchema.safeParse(parsed.value)
  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map(
        (issue) => `${issue.path.length === 0 ? '/' : issue.path.join('.')}: ${issue.message}`,
      ),
    }
  }
  return { success: true, response: result.data }
}
