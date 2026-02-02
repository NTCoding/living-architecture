import {
  readFileSync, writeFileSync 
} from 'node:fs'
import { execFileSync } from 'node:child_process'
import { z } from 'zod'

export class WorktreeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WorktreeError'
    Error.captureStackTrace?.(this, this.constructor)
  }
}

export const settingsSchema = z.object({permissions: z.object({ additionalDirectories: z.array(z.string()).optional() }).optional(),})

export type ClaudeSettings = z.infer<typeof settingsSchema>

export function removeWorktreeFromSettings(
  settings: ClaudeSettings,
  worktreePath: string,
): ClaudeSettings {
  const dirs = settings.permissions?.additionalDirectories
  if (!dirs) {
    return settings
  }

  return {
    ...settings,
    permissions: {
      ...settings.permissions,
      additionalDirectories: dirs.filter((d) => d !== worktreePath),
    },
  }
}

/* v8 ignore start -- shell and file I/O wrappers */
function execGit(args: string[]): string {
  return execFileSync('/usr/bin/env', ['git', ...args], { encoding: 'utf-8' })
}

export function resolveWorktreeInfo(): {
  worktreePath: string
  mainRepoPath: string
} {
  const worktreePath = execGit(['rev-parse', '--show-toplevel']).trim()

  const worktreeListRaw = execGit(['worktree', 'list', '--porcelain'])

  const firstLine = worktreeListRaw.split('\n')[0]
  const mainRepoPath = firstLine.replace(/^worktree /, '')

  if (worktreePath === mainRepoPath) {
    throw new WorktreeError(
      'Not in a worktree. This command must be run from a worktree directory, not the main repository.',
    )
  }

  return {
    worktreePath,
    mainRepoPath,
  }
}

export async function removeWorktreePermission(
  worktreePath: string,
  settingsPath: string,
): Promise<void> {
  const content = readSettingsFile(settingsPath)
  if (content === undefined) {
    return
  }

  const parsed = settingsSchema.safeParse(JSON.parse(content))
  if (!parsed.success) {
    return
  }

  const updated = removeWorktreeFromSettings(parsed.data, worktreePath)
  writeFileSync(settingsPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8')
}

function readSettingsFile(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return undefined
  }
}

export async function removeWorktree(worktreePath: string): Promise<void> {
  try {
    execGit(['worktree', 'remove', worktreePath])
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new WorktreeError(`Failed to remove worktree: ${message}`)
  }
}
/* v8 ignore stop */
