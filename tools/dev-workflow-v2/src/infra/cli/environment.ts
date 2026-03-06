import { homedir } from 'node:os'
import { WorkflowError } from '../../domain/workflow-error'

export function getSessionId(): string {
  const value = process.env['CLAUDE_SESSION_ID']
  if (value === undefined) {
    throw new WorkflowError('Missing required env var: CLAUDE_SESSION_ID')
  }
  return value
}

export function getPluginRoot(): string {
  const value = process.env['CLAUDE_PLUGIN_ROOT']
  if (value === undefined) {
    throw new WorkflowError('Missing required env var: CLAUDE_PLUGIN_ROOT')
  }
  return value
}

export function getEnvFilePath(): string {
  const value = process.env['CLAUDE_ENV_FILE']
  if (value === undefined) {
    throw new WorkflowError('Missing required env var: CLAUDE_ENV_FILE')
  }
  return value
}

export function getDbPath(): string {
  return `${homedir()}/.claude/workflow-events.db`
}

export function getErrorLogPath(): string {
  return `${homedir()}/.claude/dev-workflow-v2-hook-errors.log`
}
