import { z } from 'zod'

const baseHookInputSchema = z.object({
  session_id: z.string(),
  transcript_path: z.string(),
  cwd: z.string(),
  permission_mode: z.string(),
  hook_event_name: z.string(),
})

const preToolUseInputSchema = baseHookInputSchema.extend({
  hook_event_name: z.literal('PreToolUse'),
  tool_name: z.string(),
  tool_input: z.record(z.string(), z.unknown()),
})
export type PreToolUseInput = z.infer<typeof preToolUseInputSchema>

const postToolUseInputSchema = baseHookInputSchema.extend({
  hook_event_name: z.literal('PostToolUse'),
  tool_name: z.string(),
  tool_response: z.record(z.string(), z.unknown()),
})
export type PostToolUseInput = z.infer<typeof postToolUseInputSchema>

const stopInputSchema = baseHookInputSchema.extend({
  hook_event_name: z.literal('Stop'),
  stop_hook_active: z.boolean(),
})
export type StopInput = z.infer<typeof stopInputSchema>

export const hookInputSchema = z.discriminatedUnion('hook_event_name', [
  preToolUseInputSchema,
  postToolUseInputSchema,
  stopInputSchema,
])
