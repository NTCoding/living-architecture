import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { PackageFileResolveError, resolveFileOrPackagePath } from './node-module-file-resolver'

const temporaryDirectories: string[] = []

afterEach(() => {
  for (const directory of temporaryDirectories) rmSync(directory, { recursive: true })
  temporaryDirectories.length = 0
})

function createWorkspace(): string {
  const directory = mkdtempSync(join(tmpdir(), 'riviere-node-modules-'))
  temporaryDirectories.push(directory)
  writeFileSync(join(directory, 'package.json'), '{"name":"workspace"}', 'utf-8')
  return directory
}

describe('resolveFileOrPackagePath', () => {
  it('resolves relative and absolute file references', () => {
    const baseDirectory = createWorkspace()
    const absolutePath = join(baseDirectory, 'absolute.yml')

    expect(
      resolveFileOrPackagePath({
        baseDirectory,
        packageRelativePath: 'config.yml',
        source: './relative.yml',
      }),
    ).toBe(resolve(baseDirectory, './relative.yml'))
    expect(
      resolveFileOrPackagePath({
        baseDirectory,
        packageRelativePath: 'config.yml',
        source: absolutePath,
      }),
    ).toBe(absolutePath)
  })

  it('resolves a file inside an installed package', () => {
    const baseDirectory = createWorkspace()
    const packageDirectory = join(baseDirectory, 'node_modules', 'example-config')
    mkdirSync(join(packageDirectory, 'config'), { recursive: true })
    writeFileSync(join(packageDirectory, 'package.json'), '{"name":"example-config"}', 'utf-8')
    writeFileSync(join(packageDirectory, 'config', 'default.yml'), 'modules: []', 'utf-8')

    expect(
      resolveFileOrPackagePath({
        baseDirectory,
        packageRelativePath: 'config/default.yml',
        source: 'example-config',
      }),
    ).toBe(join(realpathSync(packageDirectory), 'config', 'default.yml'))
  })

  it('reports an unresolved package', () => {
    const baseDirectory = createWorkspace()

    expect(() =>
      resolveFileOrPackagePath({
        baseDirectory,
        packageRelativePath: 'config.yml',
        source: 'missing-package',
      }),
    ).toThrow(new PackageFileResolveError('missing-package'))
  })

  it('reports a package whose requested file is missing', () => {
    const baseDirectory = createWorkspace()
    const packageDirectory = join(baseDirectory, 'node_modules', 'example-config')
    mkdirSync(packageDirectory, { recursive: true })
    writeFileSync(join(packageDirectory, 'package.json'), '{"name":"example-config"}', 'utf-8')

    expect(() =>
      resolveFileOrPackagePath({
        baseDirectory,
        packageRelativePath: 'missing.yml',
        source: 'example-config',
      }),
    ).toThrow(new PackageFileResolveError('example-config'))
  })
})
