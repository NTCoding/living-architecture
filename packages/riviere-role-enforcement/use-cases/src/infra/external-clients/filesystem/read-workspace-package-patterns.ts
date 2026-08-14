import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parse } from 'yaml'

type WorkspacePackagePatterns = {
  readonly ignore: readonly string[]
  readonly include: readonly string[]
}

/** @riviere-role external-client-service */
export function readWorkspacePackagePatterns(
  workspaceDir: string,
): WorkspacePackagePatterns | null {
  const workspaceFile = path.join(workspaceDir, 'pnpm-workspace.yaml')
  if (!existsSync(workspaceFile)) {
    return null
  }
  const document: unknown = parse(readFileSync(workspaceFile, 'utf8'))
  if (
    typeof document !== 'object' ||
    document === null ||
    !('packages' in document) ||
    !Array.isArray(document.packages) ||
    !document.packages.every((pattern) => typeof pattern === 'string')
  ) {
    throw new TypeError("pnpm-workspace.yaml must contain a 'packages' array of paths.")
  }
  return {
    ignore: document.packages
      .filter((pattern) => pattern.startsWith('!'))
      .map((pattern) => pattern.slice(1)),
    include: document.packages.filter((pattern) => !pattern.startsWith('!')),
  }
}
