import type { PostToolUseInput } from '../hook-input-schemas'
import type { PostToolUseOutput } from '../hook-output-schemas'

function noContext(): PostToolUseOutput {
  return { hookSpecificOutput: { hookEventName: 'PostToolUse' } }
}

function withContext(context: string): PostToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: context,
    },
  }
}

export function handlePostToolUse(input: PostToolUseInput): PostToolUseOutput {
  const stdout = typeof input.tool_response.stdout === 'string' ? input.tool_response.stdout : ''

  if (stdout.includes('max-lines')) {
    return withContext(
      'REMINDER: max-lines is design feedback. Split the file or use it.each. Never skip tests. See docs/conventions/anti-patterns.md',
    )
  }

  return noContext()
}
