import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { readWorkspacePackagePatterns } from './read-workspace-package-patterns'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

it('reads package and exclusion patterns from the pnpm workspace', () => {
  const workspaceDir = createWorkspace(`packages:
  - packages/*
  - tools/*
  - '!tools/legacy'
`)

  expect(readWorkspacePackagePatterns(workspaceDir)).toStrictEqual({
    include: ['packages/*', 'tools/*'],
    ignore: ['tools/legacy'],
  })
})

it('returns null when the directory has no pnpm workspace', () => {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'role-enforcement-no-workspace-'))
  temporaryDirectories.push(workspaceDir)

  expect(readWorkspacePackagePatterns(workspaceDir)).toBeNull()
})

it('rejects a pnpm workspace without package paths', () => {
  const workspaceDir = createWorkspace('packages: invalid\n')

  expect(() => readWorkspacePackagePatterns(workspaceDir)).toThrow(
    "pnpm-workspace.yaml must contain a 'packages' array of paths.",
  )
})

function createWorkspace(contents: string): string {
  const workspaceDir = mkdtempSync(path.join(tmpdir(), 'role-enforcement-workspace-'))
  temporaryDirectories.push(workspaceDir)
  writeFileSync(path.join(workspaceDir, 'pnpm-workspace.yaml'), contents)
  return workspaceDir
}
