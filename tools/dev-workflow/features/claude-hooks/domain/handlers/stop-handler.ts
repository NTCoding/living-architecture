import * as fs from 'node:fs'
import { z } from 'zod'
import type { StopInput } from '../hook-input-schemas'
import type { StopOutput } from '../hook-output-schemas'
import {
  allowStop, blockStop 
} from '../permission-decision'

const MERGEABLE_PREFIX = '[Mergeable PR]'
const NOT_MERGEABLE_PREFIX = '[No Mergeable PR:'

const STOP_REMINDER = `MANDATORY: Before stopping, your response MUST start with one of:

1. ${MERGEABLE_PREFIX} - When PR is mergeable (green CI, no unresolved feedback)
   Run: pnpm nx run dev-workflow:get-pr-feedback
   Verify: mergeable=true in output

   CRITICAL: ALL unresolved threads blocking the PR must have a response.
   Use respond-to-feedback to reply to each thread before claiming mergeable.

2. ${NOT_MERGEABLE_PREFIX} <reason>] - When blocked or not working on a PR
   Examples:
   - ${NOT_MERGEABLE_PREFIX} CI failing]
   - ${NOT_MERGEABLE_PREFIX} awaiting user input]
   - ${NOT_MERGEABLE_PREFIX} not a feature task]

Your response did not include the required prefix.`

const textBlockSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
})

const messageContentSchema = z.object({ content: z.union([z.string(), z.array(z.unknown())]) })

const transcriptEntrySchema = z.object({
  type: z.literal('assistant'),
  message: messageContentSchema,
})

function extractAllTextFromContent(content: string | unknown[]): string[] {
  if (typeof content === 'string') {
    return [content]
  }

  const texts: string[] = []
  for (const block of content) {
    const parseResult = textBlockSchema.safeParse(block)
    if (parseResult.success) {
      texts.push(parseResult.data.text)
    }
  }
  return texts
}

function tryParseJson(line: string): unknown | undefined {
  try {
    return JSON.parse(line)
  } catch {
    return undefined
  }
}

function parseTranscriptEntryTexts(line: string): string[] {
  const parsed = tryParseJson(line)
  if (parsed === undefined) {
    return []
  }

  const parseResult = transcriptEntrySchema.safeParse(parsed)
  if (!parseResult.success) {
    return []
  }

  return extractAllTextFromContent(parseResult.data.message.content)
}

function getLastAssistantTexts(transcriptPath: string): string[] {
  if (!fs.existsSync(transcriptPath)) {
    return []
  }

  const content = fs.readFileSync(transcriptPath, 'utf-8')
  const lines = content.trim().split('\n').filter(Boolean).reverse()

  for (const line of lines) {
    const texts = parseTranscriptEntryTexts(line)
    if (texts.length > 0) {
      return texts
    }
  }

  return []
}

function hasValidPrefix(text: string): boolean {
  const trimmed = text.trimStart()
  return trimmed.startsWith(MERGEABLE_PREFIX) || trimmed.startsWith(NOT_MERGEABLE_PREFIX)
}

export function handleStop(input: StopInput): StopOutput {
  if (input.stop_hook_active) {
    return allowStop()
  }

  const texts = getLastAssistantTexts(input.transcript_path)

  if (texts.length === 0) {
    return blockStop(STOP_REMINDER)
  }

  if (texts.some(hasValidPrefix)) {
    return allowStop()
  }

  return blockStop(STOP_REMINDER)
}
