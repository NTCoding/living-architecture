import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * @riviere-role external-client-service
 */
export function readRepoGuidance(workspacePath: string): string {
  const guidancePath = join(workspacePath, 'AGENTS.md')
  if (!existsSync(guidancePath)) throw new MissingRepoGuidance(workspacePath)
  return readFileSync(guidancePath, 'utf8').trim()
}

/** @riviere-role external-client-error */
export class MissingRepoGuidance extends Error {
  constructor(workspacePath: string) {
    super(`The workspace at ${workspacePath} carries no AGENTS.md to guide the agent.`)
    this.name = 'MissingRepoGuidance'
  }
}
