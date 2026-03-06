import {
  describe, it, expect, afterEach 
} from 'vitest'
import type { AdapterDeps } from '../infra/domain/composition-root'
import { runWorkflow } from './workflow-cli'
import {
  buildTestDeps, cleanupDb 
} from './workflow-cli-test-fixtures'

describe('workflow-cli hooks', () => {
  const dbPaths: string[] = []

  afterEach(() => {
    for (const path of dbPaths) {
      cleanupDb(path)
    }
    dbPaths.length = 0
  })

  function setup(
    overrides: Partial<{
      readonly sessionId: string
      readonly stdinJson: string
    }> = {},
  ): AdapterDeps {
    const result = buildTestDeps(overrides)
    dbPaths.push(result.dbPath)
    return result.deps
  }

  it('handles SessionStart hook', () => {
    const stdinJson = JSON.stringify({
      session_id: 'hook-sess',
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'SessionStart',
    })
    const deps = setup({ stdinJson })
    const result = runWorkflow([], deps)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('handles unknown hook event by allowing', () => {
    const stdinJson = JSON.stringify({
      session_id: 'hook-sess',
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'UnknownEvent',
    })
    const deps = setup({ stdinJson })
    const result = runWorkflow([], deps)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('allows PreToolUse for non-existent session', () => {
    const stdinJson = JSON.stringify({
      session_id: 'no-such-session',
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
      tool_use_id: 'tu-1',
    })
    const deps = setup({ stdinJson })
    const result = runWorkflow([], deps)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('allows safe commands for active session', () => {
    const deps = setup()
    runWorkflow(['init'], deps)

    const preToolDeps: AdapterDeps = {
      ...deps,
      readStdin: () =>
        JSON.stringify({
          session_id: 'test-sess',
          transcript_path: '/transcript',
          cwd: '/dir',
          hook_event_name: 'PreToolUse',
          tool_name: 'Bash',
          tool_input: { command: 'echo hello' },
          tool_use_id: 'tu-2',
        }),
    }
    const result = runWorkflow([], preToolDeps)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('blocks dangerous commands for active session', () => {
    const deps = setup()
    runWorkflow(['init'], deps)

    const preToolDeps: AdapterDeps = {
      ...deps,
      readStdin: () =>
        JSON.stringify({
          session_id: 'test-sess',
          transcript_path: '/transcript',
          cwd: '/dir',
          hook_event_name: 'PreToolUse',
          tool_name: 'Bash',
          tool_input: { command: 'git push --force' },
          tool_use_id: 'tu-3',
        }),
    }
    const result = runWorkflow([], preToolDeps)
    expect(result.exitCode).toStrictEqual(2)
  })
})
