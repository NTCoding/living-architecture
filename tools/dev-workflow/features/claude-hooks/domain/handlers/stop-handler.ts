import * as fs from 'node:fs'
import { z } from 'zod'
import type { StopInput } from '../hook-input-schemas'
import type { StopOutput } from '../hook-output-schemas'
import {
  allowStop, blockStop 
} from '../permission-decision'

const MERGEABLE_PREFIX = '[Mergeable PR]'
const NOT_MERGEABLE_PREFIX = '[No Mergeable PR'

const STOP_REMINDER = `MANDATORY: Before stopping, your response MUST start with one of:

1. ${MERGEABLE_PREFIX} - When PR is mergeable (green CI, no unresolved feedback)
   Run: pnpm nx run dev-workflow:get-pr-feedback
   Verify: mergeable=true in output

2. ${NOT_MERGEABLE_PREFIX} <reason>] - When blocked or not working on a PR
   Examples:
   - [No Mergeable PR: CI failing]
   - [No Mergeable PR: awaiting user input]
   - [No Mergeable PR: not a feature task]

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

function extractTextFromContent(content: string | unknown[]): string | undefined {
  if (typeof content === 'string') {
    return content
  }

  for (const block of content) {
    const parseResult = textBlockSchema.safeParse(block)
    if (parseResult.success) {
      return parseResult.data.text
    }
  }
  return undefined
}

function tryParseJson(line: string): unknown | undefined {
  try {
    return JSON.parse(line)
  } catch {
    return undefined
  }
}

function parseTranscriptEntry(line: string): string | undefined {
  const parsed = tryParseJson(line)
  if (parsed === undefined) {
    return undefined
  }

  const parseResult = transcriptEntrySchema.safeParse(parsed)
  if (!parseResult.success) {
    return undefined
  }

  return extractTextFromContent(parseResult.data.message.content)
}

function getLastAssistantMessage(transcriptPath: string): string | undefined {
  if (!fs.existsSync(transcriptPath)) {
    return undefined
  }

  const content = fs.readFileSync(transcriptPath, 'utf-8')
  const lines = content.trim().split('\n').filter(Boolean).reverse()

  for (const line of lines) {
    const message = parseTranscriptEntry(line)
    if (message !== undefined) {
      return message
    }
  }

  return undefined
}

function hasValidPrefix(message: string): boolean {
  const trimmed = message.trimStart()
  return trimmed.startsWith(MERGEABLE_PREFIX) || trimmed.startsWith(NOT_MERGEABLE_PREFIX)
}

export function handleStop(input: StopInput): StopOutput {
  const lastMessage = getLastAssistantMessage(input.transcript_path)

  if (!lastMessage) {
    return blockStop(STOP_REMINDER)
  }

  if (hasValidPrefix(lastMessage)) {
    return allowStop()
  }

  return blockStop(STOP_REMINDER)
}
