import type {
  ProcessLLMRequestArgs,
  ProcessLLMRequestResult,
  Processor,
} from '@mastra/core/processors'

type Prompt = ProcessLLMRequestArgs['prompt']
type PromptMessage = Prompt[number]

/**
 * Some model providers reject requests whose message history lost its shape. Two shapes reach
 * that state after history trimming and tool-call filtering: assistant messages whose every
 * content part was removed, and tool results whose matching assistant tool call was removed.
 * Z.ai GLM answers both with "The messages parameter is illegal".
 */

/**
 * @riviere-role external-client-service
 */
export class ProviderMessageSanitizer implements Processor {
  readonly id = 'provider-message-sanitizer'
  name = 'Provider Message Sanitizer'

  processLLMRequest({ prompt }: { readonly prompt: Prompt }): ProcessLLMRequestResult {
    const { prompt: sanitized, changed } = sanitizePrompt(prompt)
    if (!changed) return undefined
    return { prompt: sanitized }
  }
}

/** @riviere-role external-client-service */
export function sanitizePrompt(prompt: Prompt): { prompt: Prompt; changed: boolean } {
  const { messages: withCompletePairs, changed: droppedParts } = dropDanglingToolResults(prompt)
  const withoutEmpty = withCompletePairs.filter((message) => !isDroppedMessage(message))
  const changed = droppedParts || withoutEmpty.length !== withCompletePairs.length
  return { prompt: withoutEmpty, changed }
}

function dropDanglingToolResults(prompt: Prompt): { messages: Prompt; changed: boolean } {
  const calledToolCallIds = new Set(
    prompt.flatMap((message) =>
      message.role === 'assistant'
        ? message.content.flatMap((part) => (part.type === 'tool-call' ? [part.toolCallId] : []))
        : [],
    ),
  )
  const messages = prompt.map((message) => {
    if (message.role !== 'tool') return message
    const kept = message.content.filter((part) => calledToolCallIds.has(part.toolCallId))
    if (kept.length === message.content.length) return message
    return { ...message, content: kept }
  })
  const changed = messages.some((message, index) => message !== prompt[index])
  return { messages, changed }
}

function isDroppedMessage(message: PromptMessage): boolean {
  if (message.role === 'assistant') return message.content.length === 0
  if (message.role === 'tool') return message.content.length === 0
  return false
}
