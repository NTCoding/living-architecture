import { query as sdkQuery } from '@anthropic-ai/claude-agent-sdk'
import { writeFile } from 'node:fs/promises'
import { z } from 'zod'
import { ClaudeQueryError } from '../errors'
export const CLAUDE_SDK_AGENT_ENV_VAR = 'CLAUDE_SDK_AGENT'

/**
 * Filesystem settings sources to load for the Claude Agent.
 * - 'user' - Global user settings (~/.claude/settings.json)
 * - 'project' - Project settings (.claude/settings.json) and CLAUDE.md
 * - 'local' - Local settings (.claude/settings.local.json)
 */
type SettingSource = 'user' | 'project' | 'local'

interface ClaudeQueryOptions<T> {
  prompt: string
  model: 'opus' | 'sonnet' | 'haiku'
  outputSchema: z.ZodSchema<T>
  outputPath: string
  /**
   * Control which filesystem settings to load.
   * - 'user' - Global user settings (~/.claude/settings.json)
   * - 'project' - Project settings (.claude/settings.json) and CLAUDE.md
   * - 'local' - Local settings (.claude/settings.local.json)
   *
   * Required to load project context, skills, and plugins.
   * @default []
   */
  settingSources?: SettingSource[]
}

const resultMessageSchema = z.object({
  type: z.literal('result'),
  subtype: z.enum(['success', 'error', 'interrupted']),
  result: z.string(),
  structured_output: z.unknown().optional(),
})

type ResultMessage = z.infer<typeof resultMessageSchema>

function extractJsonFromCodeBlock(text: string): string | null {
  const startMarker = '```json'
  const endMarker = '```'
  const startIdx = text.indexOf(startMarker)

  if (startIdx < 0) {
    return null
  }

  const jsonStart = startIdx + startMarker.length
  const jsonEnd = text.indexOf(endMarker, jsonStart)

  if (jsonEnd < 0) {
    return null
  }

  return text.slice(jsonStart, jsonEnd).trim()
}

function parseJsonFromCodeBlock<T>(result: string, schema: z.ZodSchema<T>): T {
  const jsonFromCodeBlock = extractJsonFromCodeBlock(result)
  if (jsonFromCodeBlock === null) {
    throw new ClaudeQueryError(
      'Response does not contain valid JSON. Expected either a ```json code block or raw JSON.',
    )
  }
  const parsed: unknown = JSON.parse(jsonFromCodeBlock)
  return schema.parse(parsed)
}

function isResultMessage(message: unknown): message is ResultMessage {
  return resultMessageSchema.safeParse(message).success
}

function hasAsyncIterator(
  value: object,
): value is { [Symbol.asyncIterator]: () => AsyncIterator<unknown> } {
  return Symbol.asyncIterator in value
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  if (value === null || typeof value !== 'object') {
    return false
  }
  return hasAsyncIterator(value)
}

async function* safeAsyncIterable(iterable: unknown): AsyncIterable<unknown> {
  if (!isAsyncIterable(iterable)) {
    throw new ClaudeQueryError('SDK query did not return an async iterable')
  }
  for await (const item of iterable) {
    yield item
  }
}

export const claude = {
  async query<T>(opts: ClaudeQueryOptions<T>): Promise<T> {
    const queryResult = sdkQuery({
      prompt: opts.prompt,
      options: {
        model: opts.model,
        maxTurns: 200,
        settingSources: opts.settingSources,
        env: {
          ...process.env,
          [CLAUDE_SDK_AGENT_ENV_VAR]: 'true',
        },
        outputFormat: {
          type: 'json_schema',
          schema: z.toJSONSchema(opts.outputSchema),
        },
      },
    })

    for await (const message of safeAsyncIterable(queryResult)) {
      if (!isResultMessage(message)) {
        continue
      }

      if (message.subtype !== 'success') {
        throw new ClaudeQueryError(`Claude query failed: ${message.subtype}`)
      }

      await writeFile(opts.outputPath, message.result)

      if (message.structured_output !== undefined) {
        return opts.outputSchema.parse(message.structured_output)
      }

      try {
        return parseJsonFromCodeBlock(message.result, opts.outputSchema)
      } catch (parseError) {
        const errorDetail = parseError instanceof Error ? parseError.message : String(parseError)
        throw new ClaudeQueryError(
          `Could not extract JSON from result. Parse error: ${errorDetail}. Result excerpt: ${message.result.slice(0, 300)}`,
        )
      }
    }

    throw new ClaudeQueryError('No result message received from Claude')
  },
}
