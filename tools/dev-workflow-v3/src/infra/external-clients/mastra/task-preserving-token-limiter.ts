import type {
  ProcessLLMRequestArgs,
  ProcessLLMRequestResult,
  Processor,
} from '@mastra/core/processors'

type Prompt = ProcessLLMRequestArgs['prompt']
type PromptMessage = Prompt[number]

const CHARACTERS_PER_TOKEN = 4
const TOKENS_PER_MESSAGE = 4

/**
 * History trimming must never discard the request the run is answering. The stock limiter keeps
 * the newest messages, so on a long coding session it evicts the task prompt first and the model
 * is asked to continue work it can no longer see, which Z.ai GLM rejects with "The messages
 * parameter is illegal" because the request carries no user message at all.
 */

/** @riviere-role external-client-service */
export class TaskPreservingTokenLimiter implements Processor {
  readonly id = 'task-preserving-token-limiter'
  name = 'Task Preserving Token Limiter'
  private readonly limit: number

  constructor(options: { readonly limit: number }) {
    this.limit = options.limit
  }

  processLLMRequest({ prompt }: { readonly prompt: Prompt }): ProcessLLMRequestResult {
    const kept = withinBudget(prompt, this.limit)
    if (kept.length === prompt.length) return undefined
    return { prompt: kept }
  }
}

/** @riviere-role external-client-service */
export function withinBudget(prompt: Prompt, limit: number): Prompt {
  const head = fixedHeadOf(prompt)
  const history = prompt.slice(head.length)
  const kept = newestWithinBudget(history, limit - tokensOfPrompt(head))
  return [...head, ...kept]
}

/**
 * The system messages and the first user message anchor every request: the first carries the task
 * the run is answering, and both sit at the front, so keeping them whole also keeps the provider
 * cache prefix stable.
 */
function fixedHeadOf(prompt: Prompt): Prompt {
  const firstUser = prompt.find((message) => message.role === 'user')
  if (firstUser === undefined) return prompt.filter((message) => message.role === 'system')
  const headEnd = prompt.indexOf(firstUser) + 1
  return prompt.slice(0, headEnd)
}

function newestWithinBudget(history: Prompt, limit: number): Prompt {
  const { kept } = history.reduceRight<{ kept: Prompt; used: number; stopped: boolean }>(
    (state, message) => {
      const tokens = tokensOfMessage(message)
      if (state.stopped || state.used + tokens > limit) return { ...state, stopped: true }
      return { kept: [message, ...state.kept], used: state.used + tokens, stopped: false }
    },
    { kept: [], used: 0, stopped: false },
  )
  return withoutDanglingToolResults(kept)
}

/**
 * A cut through the history can leave tool results whose assistant tool call fell outside the
 * window. The window rewinds past those results, keeping every kept exchange complete.
 */
function withoutDanglingToolResults(window: Prompt): Prompt {
  const firstKept = window[0]
  if (firstKept?.role !== 'tool') return window
  const historyStart = window.findIndex((message) => message.role !== 'tool')
  if (historyStart === -1) return []
  return window.slice(historyStart)
}

function tokensOfPrompt(prompt: Prompt): number {
  return prompt.reduce((total, message) => total + tokensOfMessage(message), 0)
}

function tokensOfMessage(message: PromptMessage): number {
  return (
    TOKENS_PER_MESSAGE + Math.ceil(JSON.stringify(message.content).length / CHARACTERS_PER_TOKEN)
  )
}
