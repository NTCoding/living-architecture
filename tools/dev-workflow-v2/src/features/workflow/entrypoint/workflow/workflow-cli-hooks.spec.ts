import { describe, it, expect, afterEach } from 'vitest'
import type { TestContext } from './__fixtures__/workflow-cli-test-fixtures'
import {
  buildTestContext,
  cleanupDb,
  progressToState,
  runCommand,
  runHook,
} from './__fixtures__/workflow-cli-test-fixtures'

describe('workflow-cli hooks', () => {
  const dbPaths: string[] = []

  afterEach(() => {
    for (const path of dbPaths) {
      cleanupDb(path)
    }
    dbPaths.length = 0
  })

  function setup(overrides?: Parameters<typeof buildTestContext>[0]): TestContext {
    const ctx = buildTestContext(overrides)
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

  it('allows workflow tools without a file path', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const stdinJson = JSON.stringify({
      session_id: ctx.sessionId,
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'workflow',
      tool_input: {
        operation: 'record-issue',
        args: ['410'],
      },
      tool_use_id: 'tu-workflow',
    })
    const result = runHook(ctx, stdinJson)
    expect(result.exitCode).toStrictEqual(0)
  })

  it('blocks Write with missing file_path', () => {
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
    expect(result.exitCode).toStrictEqual(2)
    expect(result.output).toContain('Cannot determine every file edited by Write.')
  })

  it('throws when Write file_path is non-string type', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const stdinJson = JSON.stringify({
      session_id: ctx.sessionId,
      transcript_path: '/transcript',
      cwd: '/dir',
      hook_event_name: 'PreToolUse',
      tool_name: 'Write',
      tool_input: { file_path: 123 },
      tool_use_id: 'tu-write-bad-type',
    })
    expect(() => runHook(ctx, stdinJson)).toThrow('Expected string or undefined in tool_input')
  })

  it('rejects Bash with missing command', () => {
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
    expect(() => runHook(ctx, stdinJson)).toThrow('String must contain at least 1 character')
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
    expect(() => runHook(ctx, stdinJson)).toThrow('Expected string or undefined in tool_input')
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

  it('allows direct pushes while addressing feedback', () => {
    const ctx = setup({
      getPrFeedback: () => ({
        reviewDecision: 'CHANGES_REQUESTED',
        coderabbitReviewSeen: true,
        unresolvedCount: 1,
        threads: [],
      }),
    })
    progressToState(ctx, 'ADDRESSING_FEEDBACK')

    const result = runHook(
      ctx,
      JSON.stringify({
        session_id: ctx.sessionId,
        transcript_path: '/transcript',
        cwd: '/dir',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'git push origin feat/test' },
        tool_use_id: 'tu-push',
      }),
    )

    expect(result.exitCode).toStrictEqual(0)
  })

  it('blocks direct pushes outside ADDRESSING_FEEDBACK', () => {
    const ctx = setup()
    runCommand(ctx, ['init'])

    const result = runHook(
      ctx,
      JSON.stringify({
        session_id: ctx.sessionId,
        transcript_path: '/transcript',
        cwd: '/dir',
        hook_event_name: 'PreToolUse',
        tool_name: 'Bash',
        tool_input: { command: 'git push origin feat/test' },
        tool_use_id: 'tu-push-outside-feedback',
      }),
    )

    expect(result.exitCode).toStrictEqual(2)
  })

  it.each(['git push --force', 'git push --force-with-lease'])(
    'blocks %s while addressing feedback',
    (command) => {
      const ctx = setup({
        getPrFeedback: () => ({
          reviewDecision: 'CHANGES_REQUESTED',
          coderabbitReviewSeen: true,
          unresolvedCount: 1,
          threads: [],
        }),
      })
      progressToState(ctx, 'ADDRESSING_FEEDBACK')

      const result = runHook(
        ctx,
        JSON.stringify({
          session_id: ctx.sessionId,
          transcript_path: '/transcript',
          cwd: '/dir',
          hook_event_name: 'PreToolUse',
          tool_name: 'Bash',
          tool_input: { command },
          tool_use_id: 'tu-force-push',
        }),
      )

      expect(result.exitCode).toStrictEqual(2)
    },
  )
})
