import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CodexSessionMetadataError, readCodexParentThreadId } from './codex-session'

const directories: string[] = []

function withCodexHome(): string {
  const directory = mkdtempSync(join(tmpdir(), 'codex-workflow-session-'))
  directories.push(directory)
  return directory
}

function writeSessionMetadata(codexHome: string, threadId: string, payload: unknown): void {
  const sessionsDirectory = join(codexHome, 'sessions', '2026', '08', '21')
  mkdirSync(sessionsDirectory, { recursive: true })
  writeFileSync(
    join(sessionsDirectory, `rollout-2026-08-21T08-00-00-${threadId}.jsonl`),
    `${JSON.stringify({ type: 'session_meta', payload })}\n`,
  )
}

afterEach(() => {
  for (const directory of directories) rmSync(directory, { recursive: true, force: true })
  directories.length = 0
})

describe('readCodexParentThreadId', () => {
  it('returns undefined when the current session is not a subagent', () => {
    const codexHome = withCodexHome()
    writeSessionMetadata(codexHome, 'parent-session', { thread_source: 'cli' })

    expect(readCodexParentThreadId('parent-session', codexHome)).toBeUndefined()
  })

  it('returns undefined when no local transcript exists', () => {
    const codexHome = withCodexHome()

    expect(readCodexParentThreadId('parent-session', codexHome)).toBeUndefined()
  })

  it('returns undefined when no transcript matches the current session', () => {
    const codexHome = withCodexHome()
    writeSessionMetadata(codexHome, 'other-session', { thread_source: 'cli' })

    expect(readCodexParentThreadId('parent-session', codexHome)).toBeUndefined()
  })

  it('returns undefined when a transcript does not start with session metadata', () => {
    const codexHome = withCodexHome()
    const sessionsDirectory = join(codexHome, 'sessions', '2026', '08', '21')
    mkdirSync(sessionsDirectory, { recursive: true })
    writeFileSync(
      join(sessionsDirectory, 'rollout-2026-08-21T08-00-00-parent-session.jsonl'),
      `${JSON.stringify({ type: 'response_item' })}\n`,
    )

    expect(readCodexParentThreadId('parent-session', codexHome)).toBeUndefined()
  })

  it('returns undefined when a transcript is empty', () => {
    const codexHome = withCodexHome()
    const sessionsDirectory = join(codexHome, 'sessions', '2026', '08', '21')
    mkdirSync(sessionsDirectory, { recursive: true })
    writeFileSync(join(sessionsDirectory, 'rollout-2026-08-21T08-00-00-parent-session.jsonl'), '')

    expect(readCodexParentThreadId('parent-session', codexHome)).toBeUndefined()
  })

  it('returns undefined when session metadata has no subagent source', () => {
    const codexHome = withCodexHome()
    writeSessionMetadata(codexHome, 'parent-session', { source: {} })

    expect(readCodexParentThreadId('parent-session', codexHome)).toBeUndefined()
  })

  it('uses parent_thread_id from a spawned subagent session', () => {
    const codexHome = withCodexHome()
    writeSessionMetadata(codexHome, 'child-session', {
      thread_source: 'subagent',
      source: { subagent: { thread_spawn: { parent_thread_id: 'parent-session' } } },
    })

    expect(readCodexParentThreadId('child-session', codexHome)).toStrictEqual('parent-session')
  })

  it('uses forked_from_id when parent_thread_id is unavailable', () => {
    const codexHome = withCodexHome()
    writeSessionMetadata(codexHome, 'child-session', {
      thread_source: 'subagent',
      forked_from_id: 'parent-session',
    })

    expect(readCodexParentThreadId('child-session', codexHome)).toStrictEqual('parent-session')
  })

  it('fails when a subagent transcript has no parent identifier', () => {
    const codexHome = withCodexHome()
    writeSessionMetadata(codexHome, 'child-session', { thread_source: 'subagent' })

    expect(() => readCodexParentThreadId('child-session', codexHome)).toThrow(
      new CodexSessionMetadataError('child-session'),
    )
  })

  it('recognises a spawned subagent when thread_source is absent', () => {
    const codexHome = withCodexHome()
    writeSessionMetadata(codexHome, 'child-session', {
      source: { subagent: { thread_spawn: {} } },
    })

    expect(() => readCodexParentThreadId('child-session', codexHome)).toThrow(
      new CodexSessionMetadataError('child-session'),
    )
  })
})
