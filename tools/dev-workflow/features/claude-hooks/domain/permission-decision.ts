import type {
  PreToolUseOutput, StopOutput 
} from './hook-output-schemas'

export function allow(reason: string): PreToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: reason,
    },
  }
}

export function deny(reason: string): PreToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }
}

export function allowStop(): StopOutput {
  return { _tag: 'allow' }
}

export function blockStop(reason: string): StopOutput {
  return {
    _tag: 'block',
    reason,
  }
}
