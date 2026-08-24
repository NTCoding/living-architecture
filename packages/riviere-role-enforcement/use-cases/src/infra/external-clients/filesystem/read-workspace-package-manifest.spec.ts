import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readWorkspacePackageManifest } from './read-workspace-package-manifest'

const temporaryDirectories: string[] = []

function createManifest(source: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'riviere-package-manifest-'))
  temporaryDirectories.push(directory)
  const manifestPath = path.join(directory, 'package.json')
  writeFileSync(manifestPath, source)
  return manifestPath
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true })
  }
})

describe('readWorkspacePackageManifest', () => {
  it('returns the parsed package manifest', () => {
    const manifestPath = createManifest('{"description":"Models package rules."}')

    expect(readWorkspacePackageManifest(manifestPath)).toStrictEqual({
      description: 'Models package rules.',
    })
  })

  it('throws when the package manifest is not valid JSON', () => {
    const manifestPath = createManifest('{invalid')

    expect(() => readWorkspacePackageManifest(manifestPath)).toThrow(SyntaxError)
  })
})
