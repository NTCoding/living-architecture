import {
  describe, it, expect, afterEach 
} from 'vitest'
import type { TestContext } from './fixtures/workflow-cli-test-fixtures'
import {
  buildTestContext,
  cleanupDb,
  runCommand,
  runHook,
} from './fixtures/workflow-cli-test-fixtures'

describe('workflow-cli hooks', () => {
  const dbPaths: string[] = []

  afterEach(() => {
    for (const path of dbPaths) {
      cleanupDb(path)
    }
    dbPaths.length = 0
  })

  function setup(): TestContext {
    const ctx = buildTestContext()
    dbPaths.push(ctx.dbPath)
    return ctx
  }

  it('handles SessionStart hook', () => {
    const ctx = setup()
    const stdinJson = JSON.stringify({
      session_id: 'hook-sess',
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'SessionStart',
    })
    const result = runHook(ctx, stdinJson)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('handles unknown hook event by allowing', () => {
    const ctx = setup()
    const stdinJson = JSON.stringify({
      session_id: 'hook-sess',
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'UnknownEvent',
    })
    const result = runHook(ctx, stdinJson)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('allows PreToolUse for non-existent session', () => {
    const ctx = setup()
    const stdinJson = JSON.stringify({
      session_id: 'no-such-session',
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
      tool_use_id: 'tu-1',
    })
    const result = runHook(ctx, stdinJson)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('allows safe commands for active session', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const stdinJson = JSON.stringify({
      session_id: ctx.sessionId,
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'echo hello' },
      tool_use_id: 'tu-2',
    })
    const result = runHook(ctx, stdinJson)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('allows Write to non-protected file', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const stdinJson = JSON.stringify({
      session_id: ctx.sessionId,
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: {
        file_path: '/some/file.ts',
        content: 'hello',
      },
      tool_use_id: 'tu-non-bash',
    })
    const result = runHook(ctx, stdinJson)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('blocks Write to protected config file', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const stdinJson = JSON.stringify({
      session_id: ctx.sessionId,
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/project/nx.json' },
      tool_use_id: 'tu-write-blocked',
    })
    const result = runHook(ctx, stdinJson)
    expect(result.exitCode).toStrictEqual(2)
  })

  it('allows non-Bash/Write/Edit tools without check', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const stdinJson = JSON.stringify({
      session_id: ctx.sessionId,
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Read',
      tool_input: { file_path: '/some/file.ts' },
      tool_use_id: 'tu-read',
    })
    const result = runHook(ctx, stdinJson)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('allows Write with missing file_path (empty string passed to predicate)', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const stdinJson = JSON.stringify({
      session_id: ctx.sessionId,
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: {},
      tool_use_id: 'tu-write-no-path',
    })
    const result = runHook(ctx, stdinJson)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('throws when Write file_path is non-string type', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const stdinJson = JSON.stringify({
      session_id: ctx.sessionId,
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Edit',
      tool_input: { file_path: 123 },
      tool_use_id: 'tu-write-bad-type',
    })
    expect(() => runHook(ctx, stdinJson)).toThrow("Expected 'file_path' to be a string, got number")
  })

  it('allows Bash with missing command (empty string passed to check)', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const stdinJson = JSON.stringify({
      session_id: ctx.sessionId,
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: {},
      tool_use_id: 'tu-missing-cmd',
    })
    const result = runHook(ctx, stdinJson)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('throws when Bash command is non-string type', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const stdinJson = JSON.stringify({
      session_id: ctx.sessionId,
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 42 },
      tool_use_id: 'tu-bad-type',
    })
    expect(() => runHook(ctx, stdinJson)).toThrow("Expected 'command' to be a string, got number")
  })

  it('blocks dangerous commands for active session', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const stdinJson = JSON.stringify({
      session_id: ctx.sessionId,
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Bash',
      tool_input: { command: 'git push --force' },
      tool_use_id: 'tu-3',
    })
    const result = runHook(ctx, stdinJson)
    expect(result.exitCode).toStrictEqual(2)
  })
})
