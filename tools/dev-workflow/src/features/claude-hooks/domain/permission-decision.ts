import type {
  PreToolUseOutput, StopOutput 
} from './hook-output-schemas'

/** @riviere-role domain-service */
export function allow(reason: string): PreToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: reason,
    },
  }
}

/** @riviere-role domain-service */
export function deny(reason: string): PreToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }
}

/** @riviere-role domain-service */
export function allowStop(): StopOutput {
  return { _tag: 'allow' }
}

/** @riviere-role domain-service */
export function blockStop(reason: string): StopOutput {
  return {
    _tag: 'block',
    reason,
  }
}
