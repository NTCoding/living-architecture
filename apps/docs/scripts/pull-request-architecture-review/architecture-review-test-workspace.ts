import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const temporaryWorkspaces: string[] = []

export function createWorkspace(): string {
  const workspace = mkdtempSync(path.join(tmpdir(), 'architecture-review-'))
  temporaryWorkspaces.push(workspace)
  return workspace
}

export function removeTemporaryWorkspaces(): void {
  for (const workspace of temporaryWorkspaces.splice(0)) {
    rmSync(workspace, { force: true, recursive: true })
  }
}

export function writeWorkspaceFile(workspace: string, relativePath: string, source: string): void {
  const filePath = path.join(workspace, relativePath)
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, source)
}
