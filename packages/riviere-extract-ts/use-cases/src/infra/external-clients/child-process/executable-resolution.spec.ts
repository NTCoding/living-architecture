import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExecutableResolver, windowsPathExtensions } from './executable-resolution'

const directories: string[] = []
const resolver = new ExecutableResolver()

async function createDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'executable-resolution-'))
  directories.push(directory)
  return directory
}

afterEach(async () => {
  vi.unstubAllEnvs()
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true })
  }
})

describe('windowsPathExtensions', () => {
  it('returns the default Windows extensions when PATHEXT is absent', () => {
    expect(windowsPathExtensions('win32', undefined)).toStrictEqual([
      '.COM',
      '.EXE',
      '.BAT',
      '.CMD',
    ])
  })

  it('normalizes configured Windows extensions', () => {
    expect(windowsPathExtensions('win32', 'CMD;.bat;')).toStrictEqual(['.CMD', '.bat'])
  })

  it('returns no extensions on non-Windows platforms', () => {
    expect(windowsPathExtensions('linux', '.CMD')).toStrictEqual([])
  })
})

describe('ChildProcessClient executable resolution', () => {
  it('resolves an executable path that exists', () => {
    expect(resolver.resolveExecutable(process.execPath)).toStrictEqual({
      kind: 'resolved',
      executablePath: process.execPath,
    })
  })

  it('resolves a command found on PATH to the node executable', () => {
    const resolution = resolver.resolveExecutable('node')

    expect(resolution.kind).toBe('resolved')
    expect(resolution.kind === 'resolved' && basename(resolution.executablePath)).toBe('node')
  })

  it('reports a file without execute permission as not found', async () => {
    const directory = await createDirectory()
    const command = join(directory, 'not-executable-ai-cli')
    await writeFile(command, 'not executable')
    await chmod(command, 0o644)

    expect(resolver.resolveExecutable(command)).toStrictEqual({ kind: 'not-found', command })
  })

  it('reports a whitespace-only command as invalid', () => {
    expect(resolver.resolveExecutable('   ')).toStrictEqual({
      kind: 'invalid-command',
      command: '   ',
    })
  })

  it('reports an existing directory as not found', () => {
    expect(resolver.resolveExecutable('/tmp')).toStrictEqual({ kind: 'not-found', command: '/tmp' })
  })

  it('reports a missing executable path as not found', () => {
    const command = join(tmpdir(), 'missing-ai-cli-executable')

    expect(resolver.resolveExecutable(command)).toStrictEqual({ kind: 'not-found', command })
  })

  it('reports a command as not found when no PATH directory contains it', () => {
    expect(resolver.resolveExecutable('definitely-not-a-real-ai-cli-command')).toStrictEqual({
      kind: 'not-found',
      command: 'definitely-not-a-real-ai-cli-command',
    })
  })

  it('does not search the current working directory when PATH is unavailable', async () => {
    const directory = await createDirectory()
    const command = 'local-ai-cli'
    const executable = join(directory, command)
    await writeFile(executable, 'local executable')
    await chmod(executable, 0o755)
    const originalWorkingDirectory = process.cwd()
    vi.stubEnv('PATH', undefined)
    process.chdir(directory)
    try {
      expect(resolver.resolveExecutable(command)).toStrictEqual({ kind: 'not-found', command })
    } finally {
      process.chdir(originalWorkingDirectory)
    }
  })

  it('reports a Windows batch shim as unsupported because execution disables the shell', async () => {
    const directory = await createDirectory()
    const command = join(directory, 'claude.CMD')
    await writeFile(command, '')
    await chmod(command, 0o755)
    const windowsClient = new ExecutableResolver(() => ({
      platform: 'win32',
      searchPath: directory,
      pathExtensions: ['.CMD'],
    }))

    expect(windowsClient.resolveExecutable('claude')).toStrictEqual({
      kind: 'unsupported',
      command: 'claude',
      reason: `Expected an executable command. Got '${command}'. Context: Windows batch shims require a shell, which is disabled`,
    })
  })

  it('reports a Windows command as not found when no PATHEXT extension matches', async () => {
    const directory = await createDirectory()
    const windowsClient = new ExecutableResolver(() => ({
      platform: 'win32',
      searchPath: directory,
      pathExtensions: ['.CMD'],
    }))

    expect(windowsClient.resolveExecutable('claude')).toStrictEqual({
      kind: 'not-found',
      command: 'claude',
    })
  })
})
