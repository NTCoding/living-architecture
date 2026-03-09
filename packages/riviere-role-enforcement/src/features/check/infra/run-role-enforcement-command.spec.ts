import {
  existsSync, mkdtempSync, rmSync, writeFileSync 
} from 'node:fs'
import { spawnSync } from 'node:child_process'
import { runRoleEnforcementCommand } from './run-role-enforcement-command'

const mockTempDirectory = '/Users/test/tmp/riviere-role-enforcement-123'

function createSpawnResult(status: number | null): ReturnType<typeof spawnSync> {
  return {
    pid: 1,
    output: [null, Buffer.alloc(0), Buffer.alloc(0)],
    stdout: Buffer.alloc(0),
    stderr: Buffer.alloc(0),
    status,
    signal: null,
  }
}

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  mkdtempSync: vi.fn(),
  rmSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

vi.mock('node:os', () => ({ tmpdir: vi.fn(() => '/Users/test/tmp') }))

vi.mock('node:child_process', () => ({ spawnSync: vi.fn() }))

describe('runRoleEnforcementCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mkdtempSync).mockReturnValue(mockTempDirectory)
  })

  it('throws when the requested config file does not exist', () => {
    vi.mocked(existsSync).mockReturnValue(false)

    expect(() => runRoleEnforcementCommand(['--config', 'missing.yaml'])).toThrowError(
      /Role enforcement config does not exist/,
    )
  })

  it('writes an oxlint config, runs oxlint, and cleans up the temp directory', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue(createSpawnResult(0))

    const exitCode = runRoleEnforcementCommand([
      '--config',
      'riviere-role-enforcement.yaml',
      'packages/demo/src/shell/cli.ts',
    ])

    expect(exitCode).toBe(0)
    expect(vi.mocked(writeFileSync).mock.calls).toStrictEqual([
      [
        `${mockTempDirectory}/oxlint-plugin.cjs`,
        expect.stringContaining(
          'packages/riviere-role-enforcement/dist/features/check/infra/oxlint-plugin.cjs',
        ),
      ],
      [
        `${mockTempDirectory}/.oxlintrc.json`,
        expect.stringContaining('riviere-role-enforcement.yaml'),
      ],
    ])
    expect(spawnSync).toHaveBeenCalledWith(
      expect.stringContaining('node_modules/.bin/oxlint'),
      ['-c', `${mockTempDirectory}/.oxlintrc.json`, 'packages/demo/src/shell/cli.ts'],
      { stdio: 'inherit' },
    )
    expect(rmSync).toHaveBeenCalledWith(mockTempDirectory, {
      recursive: true,
      force: true,
    })
  })

  it('returns 1 when oxlint does not report a status code', () => {
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(spawnSync).mockReturnValue(createSpawnResult(null))

    expect(runRoleEnforcementCommand(['--config', 'riviere-role-enforcement.yaml'])).toBe(1)
  })
})
