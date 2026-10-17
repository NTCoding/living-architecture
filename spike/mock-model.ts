/**
 * A stand-in model for the spike. No API key is needed because every check
 * here is about Mastra's plumbing, not the quality of an answer.
 */
import type { LanguageModelV2CallOptions } from '@ai-sdk/provider'

type Content =
  | { type: 'text'; text: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; input: string }

type Responder = (options: LanguageModelV2CallOptions) => Content[]

export function createResponderModel(responder: Responder): unknown {
  return {
    specificationVersion: 'v2',
    provider: 'spike',
    modelId: 'spike/mock',
    supportedUrls: {},
    async doGenerate(options: LanguageModelV2CallOptions) {
      return {
        content: responder(options),
        finishReason: 'stop',
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
      }
    },
    async doStream() {
      throw new Error('the spike uses generate, not stream')
    },
  }
}

/**
 * Returns true when the prompt already contains a result for the named tool.
 * Used to switch the mock from "call the tool" to "answer with the result".
 */
export function hasToolResult(options: LanguageModelV2CallOptions, toolName: string): boolean {
  const prompt = JSON.stringify(options.prompt)
  return prompt.includes(`"tool-result"`) && prompt.includes(toolName)
}
