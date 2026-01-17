import { query as sdkQuery } from '@anthropic-ai/claude-agent-sdk'
import { writeFile } from 'node:fs/promises'
import { z } from 'zod'

export interface ClaudeQueryOptions<T> {
  prompt: string
  model: 'opus' | 'sonnet' | 'haiku'
  outputSchema: z.ZodSchema<T>
  outputPath: string
}

export class ClaudeQueryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ClaudeQueryError'
  }
}

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

function parseJsonFromCodeBlockOrRaw<T>(result: string, schema: z.ZodSchema<T>): T {
  const jsonFromCodeBlock = extractJsonFromCodeBlock(result)
  const jsonToParse = jsonFromCodeBlock ?? result
  const parsed: unknown = JSON.parse(jsonToParse)
  return schema.parse(parsed)
}

export const claude = {
  async query<T>(opts: ClaudeQueryOptions<T>): Promise<T> {
    for await (const message of sdkQuery({
      prompt: opts.prompt,
      options: {
        model: opts.model,
        maxTurns: 200,
        outputFormat: {
          type: 'json_schema',
          schema: z.toJSONSchema(opts.outputSchema),
        },
      },
    })) {
      if (message.type !== 'result') {
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
        return parseJsonFromCodeBlockOrRaw(message.result, opts.outputSchema)
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
