import { existsSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { runOxlint } from './oxlint-client'
import type { OxlintConfig } from './oxlint-config'
import { OxlintExecutionError } from './oxlint-execution-error'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
  }
})

const config: OxlintConfig = {
  ignorePatterns: [],
  jsPlugins: [],
  plugins: [],
  rules: {},
}

function dependencies(spawnResult: {
  error?: Error
  status: number | null
  stderr: string
  stdout: string
}) {
  return {
    rmSync: vi.fn(),
    spawnSync: vi.fn(() => spawnResult),
    writeFileSync: vi.fn(),
  }
}

it('throws OxlintExecutionError when the process cannot start', () => {
  expect(() =>
    runOxlint(
      {
        config,
        configDir: '/var/folders/fake-dir',
        lintTargets: [],
      },
      dependencies({
        error: new TypeError('spawn failed'),
        status: null,
        stderr: '',
        stdout: '',
      }),
    ),
  ).toThrowError(new OxlintExecutionError('spawn failed'))
})

it('removes the temporary configuration after execution', () => {
  const clientDependencies = dependencies({
    status: 0,
    stderr: '',
    stdout: '',
  })

  runOxlint(
    {
      config,
      configDir: '/var/folders/fake-dir',
      lintTargets: [],
    },
    clientDependencies,
  )

  expect(clientDependencies.rmSync).toHaveBeenCalledWith(
    expect.stringContaining('.oxlintrc.role-enforcement.'),
    { force: true },
  )
})

it('defaults the exit code to one when the process has no status', () => {
  const result = runOxlint(
    {
      config,
      configDir: '/var/folders/fake-dir',
      lintTargets: [],
    },
    dependencies({
      status: null,
      stderr: '',
      stdout: '',
    }),
  )

  expect(result.exitCode).toBe(1)
})

it('throws OxlintExecutionError when the binary is unavailable', () => {
  vi.mocked(existsSync).mockReturnValue(false)
  try {
    expect(() =>
      runOxlint(
        {
          config,
          configDir: '/var/folders/fake-dir',
          lintTargets: [],
        },
        dependencies({
          status: 0,
          stderr: '',
          stdout: '',
        }),
      ),
    ).toThrowError(new OxlintExecutionError('Cannot find oxlint binary in node_modules'))
  } finally {
    vi.mocked(existsSync).mockRestore()
  }
})
