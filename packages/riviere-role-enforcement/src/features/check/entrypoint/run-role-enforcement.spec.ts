describe('run-role-enforcement entrypoint', () => {
  const originalArgv = process.argv
  const originalExitCode = process.exitCode

  beforeEach(() => {
    vi.resetModules()
    process.argv = ['node', 'run-role-enforcement', '--config', 'demo.yaml']
    process.exitCode = undefined
  })

  afterEach(() => {
    process.argv = originalArgv
    process.exitCode = originalExitCode
    vi.restoreAllMocks()
  })

  it('sets process.exitCode from the command result', async () => {
    const runRoleEnforcementCommand = vi.fn(() => 7)
    vi.doMock('../infra/run-role-enforcement-command', () => ({ runRoleEnforcementCommand }))

    await import('./run-role-enforcement')

    expect(runRoleEnforcementCommand).toHaveBeenCalledWith(['--config', 'demo.yaml'])
    expect(process.exitCode).toBe(7)
  })

  it('logs Error messages and exits with code 1', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn())
    vi.doMock('../infra/run-role-enforcement-command', () => ({
      runRoleEnforcementCommand: vi.fn(() => {
        throw new TypeError('boom')
      }),
    }))

    await import('./run-role-enforcement')

    expect(errorSpy).toHaveBeenCalledWith('Role enforcement execution error: boom')
    expect(process.exitCode).toBe(1)
  })

  it('logs a fallback message for non-Error throwables', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn())
    vi.doMock('../infra/run-role-enforcement-command', () => ({
      runRoleEnforcementCommand: vi.fn(() => {
        throw 'boom'
      }),
    }))

    await import('./run-role-enforcement')

    expect(errorSpy).toHaveBeenCalledWith(
      'Role enforcement execution error: Unknown role enforcement execution error',
    )
    expect(process.exitCode).toBe(1)
  })
})
