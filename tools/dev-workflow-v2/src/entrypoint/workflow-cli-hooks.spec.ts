import {
  describe, it, expect, afterEach 
} from 'vitest'
import type { AdapterDeps } from '../shell/composition-root'
import { runWorkflow } from './workflow-cli'
import {
  buildTestDeps, cleanupDb 
} from './fixtures/workflow-cli-test-fixtures'

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

  it('allows non-Bash tools without engine check', () => {
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
          tool_name: 'Write',
          tool_input: {
            file_path: '/some/file.ts',
            content: 'hello',
          },
          tool_use_id: 'tu-non-bash',
        }),
    }
    const result = runWorkflow([], preToolDeps)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('blocks Write to protected config file', () => {
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
          tool_name: 'Write',
          tool_input: { file_path: '/project/nx.json' },
          tool_use_id: 'tu-write-blocked',
        }),
    }
    const result = runWorkflow([], preToolDeps)
    expect(result.exitCode).toStrictEqual(2)
  })

  it('allows non-Bash/Write/Edit tools without check', () => {
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
          tool_name: 'Read',
          tool_input: { file_path: '/some/file.ts' },
          tool_use_id: 'tu-read',
        }),
    }
    const result = runWorkflow([], preToolDeps)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('throws when Write tool_input has no file_path field', () => {
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
          tool_name: 'Write',
          tool_input: {},
          tool_use_id: 'tu-write-no-path',
        }),
    }
    expect(() => runWorkflow([], preToolDeps)).toThrow(
      'Expected Write/Edit tool_input to have a file_path field',
    )
  })

  it('throws when Write file_path is non-string type', () => {
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
          tool_name: 'Edit',
          tool_input: { file_path: 123 },
          tool_use_id: 'tu-write-bad-type',
        }),
    }
    expect(() => runWorkflow([], preToolDeps)).toThrow(
      'Expected tool_input.file_path to be string. Got number: 123',
    )
  })

  it('throws when Bash tool_input has no command field', () => {
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
          tool_input: {},
          tool_use_id: 'tu-missing-cmd',
        }),
    }
    expect(() => runWorkflow([], preToolDeps)).toThrow(
      'Expected Bash tool_input to have a command field',
    )
  })

  it('throws when Bash command is non-string type', () => {
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
          tool_input: { command: 42 },
          tool_use_id: 'tu-bad-type',
        }),
    }
    expect(() => runWorkflow([], preToolDeps)).toThrow(
      'Expected tool_input.command to be string. Got number: 42',
    )
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
