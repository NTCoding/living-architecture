import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  describe, it, expect, afterEach, afterAll 
} from 'vitest'
import { handlePreToolUse } from './domain/handlers/pre-tool-use'
import { handlePostToolUse } from './domain/handlers/post-tool-use'
import { handleStop } from './domain/handlers/stop'
import type {
  PreToolUseInput, PostToolUseInput, StopInput 
} from './domain/hook-input-schemas'

function createPreToolUseInput(command: string): PreToolUseInput {
  return {
    session_id: 'test-session',
    transcript_path: '/test/transcript.jsonl',
    cwd: '/test',
    permission_mode: 'default',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
  }
}

function createPostToolUseInput(stdout: string): PostToolUseInput {
  return {
    session_id: 'test-session',
    transcript_path: '/test/transcript.jsonl',
    cwd: '/test',
    permission_mode: 'default',
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    tool_response: { stdout },
  }
}

function createStopInput(transcriptPath: string, stopHookActive = false): StopInput {
  return {
    session_id: 'test-session',
    transcript_path: transcriptPath,
    cwd: '/test',
    permission_mode: 'default',
    hook_event_name: 'Stop',
    stop_hook_active: stopHookActive,
  }
}

describe('PreToolUse handler', () => {
  describe('dangerous flags', () => {
    it.each(['--no-verify', '--force', '--hard'])('blocks %s flag', (flag) => {
      const input = createPreToolUseInput(`git commit ${flag}`)
      const result = handlePreToolUse(input)

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny')
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain(flag)
    })

    it('allows commands without dangerous flags', () => {
      const input = createPreToolUseInput('git commit -m "test"')
      const result = handlePreToolUse(input)

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow')
    })
  })

  describe('blocked commands', () => {
    it('blocks git push', () => {
      const input = createPreToolUseInput('git push origin main')
      const result = handlePreToolUse(input)

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny')
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('/complete-task')
    })

    it('blocks gh pr commands', () => {
      const input = createPreToolUseInput('gh pr create --title "test"')
      const result = handlePreToolUse(input)

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny')
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('gh pr')
    })

    it('blocks gh api for review threads', () => {
      const input = createPreToolUseInput('gh api repos/owner/repo/pulls/1/reviews')
      const result = handlePreToolUse(input)

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny')
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('respond-to-feedback')
    })

    it('allows other gh api commands', () => {
      const input = createPreToolUseInput('gh api repos/owner/repo/issues')
      const result = handlePreToolUse(input)

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow')
    })
  })

  it('allows safe commands', () => {
    const input = createPreToolUseInput('pnpm nx test')
    const result = handlePreToolUse(input)

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow')
  })

  it('handles empty command', () => {
    const input = createPreToolUseInput('')
    const result = handlePreToolUse(input)

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow')
  })
})

describe('PostToolUse handler', () => {
  it('adds context when stdout contains max-lines', () => {
    const input = createPostToolUseInput('error: max-lines violation in file.ts')
    const result = handlePostToolUse(input)

    expect(result.hookSpecificOutput.additionalContext).toContain('max-lines')
    expect(result.hookSpecificOutput.additionalContext).toContain('anti-patterns.md')
  })

  it('returns no context for normal output', () => {
    const input = createPostToolUseInput('All tests passed')
    const result = handlePostToolUse(input)

    expect(result.hookSpecificOutput.additionalContext).toBeUndefined()
  })
})

describe('Stop handler', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-test-'))

  afterEach(() => {
    const files = fs.readdirSync(tempDir)
    for (const file of files) {
      fs.unlinkSync(path.join(tempDir, file))
    }
  })

  afterAll(() => {
    fs.rmdirSync(tempDir)
  })

  function writeTranscript(lines: object[]): string {
    const transcriptPath = path.join(tempDir, `transcript-${Date.now()}.jsonl`)
    const content = lines.map((line) => JSON.stringify(line)).join('\n')
    fs.writeFileSync(transcriptPath, content)
    return transcriptPath
  }

  it('allows stop when response starts with [Mergeable PR]', () => {
    const transcriptPath = writeTranscript([
      {
        type: 'assistant',
        message: { content: '[Mergeable PR] All checks passed.' },
      },
    ])
    const input = createStopInput(transcriptPath)
    const result = handleStop(input)

    expect(result.decision).toBeUndefined()
  })

  it('allows stop when response starts with [No Mergeable PR', () => {
    const transcriptPath = writeTranscript([
      {
        type: 'assistant',
        message: { content: '[No Mergeable PR: CI failing] Need to fix tests.' },
      },
    ])
    const input = createStopInput(transcriptPath)
    const result = handleStop(input)

    expect(result.decision).toBeUndefined()
  })

  it('blocks stop when response lacks required prefix', () => {
    const transcriptPath = writeTranscript([
      {
        type: 'assistant',
        message: { content: 'I have completed the task.' },
      },
    ])
    const input = createStopInput(transcriptPath)
    const result = handleStop(input)

    expect(result.decision).toBe('block')
    expect(result.reason).toContain('[Mergeable PR]')
  })

  it('blocks stop when transcript is empty', () => {
    const transcriptPath = path.join(tempDir, 'empty.jsonl')
    fs.writeFileSync(transcriptPath, '')
    const input = createStopInput(transcriptPath)
    const result = handleStop(input)

    expect(result.decision).toBe('block')
  })

  it('blocks stop when transcript file does not exist', () => {
    const input = createStopInput('/nonexistent/transcript.jsonl')
    const result = handleStop(input)

    expect(result.decision).toBe('block')
  })

  it('handles content array format', () => {
    const transcriptPath = writeTranscript([
      {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'text',
              text: '[Mergeable PR] Done.',
            },
          ],
        },
      },
    ])
    const input = createStopInput(transcriptPath)
    const result = handleStop(input)

    expect(result.decision).toBeUndefined()
  })

  it('finds last assistant message in multi-message transcript', () => {
    const transcriptPath = writeTranscript([
      {
        type: 'user',
        message: { content: 'Do the task' },
      },
      {
        type: 'assistant',
        message: { content: 'Working on it...' },
      },
      {
        type: 'user',
        message: { content: 'Continue' },
      },
      {
        type: 'assistant',
        message: { content: '[Mergeable PR] Finished.' },
      },
    ])
    const input = createStopInput(transcriptPath)
    const result = handleStop(input)

    expect(result.decision).toBeUndefined()
  })

  it('allows prefix with leading whitespace', () => {
    const transcriptPath = writeTranscript([
      {
        type: 'assistant',
        message: { content: '  [Mergeable PR] Done.' },
      },
    ])
    const input = createStopInput(transcriptPath)
    const result = handleStop(input)

    expect(result.decision).toBeUndefined()
  })

  it('blocks when content array has no text blocks', () => {
    const transcriptPath = writeTranscript([
      {
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'some_tool',
            },
          ],
        },
      },
    ])
    const input = createStopInput(transcriptPath)
    const result = handleStop(input)

    expect(result.decision).toBe('block')
  })

  it('skips non-assistant transcript entries', () => {
    const transcriptPath = writeTranscript([
      {
        type: 'system',
        message: { content: 'System message' },
      },
      {
        type: 'assistant',
        message: { content: '[Mergeable PR] Done.' },
      },
    ])
    const input = createStopInput(transcriptPath)
    const result = handleStop(input)

    expect(result.decision).toBeUndefined()
  })

  it('finds last assistant message when user message is last', () => {
    const transcriptPath = writeTranscript([
      {
        type: 'assistant',
        message: { content: '[Mergeable PR] Done.' },
      },
      {
        type: 'user',
        message: { content: 'User message last' },
      },
    ])
    const input = createStopInput(transcriptPath)
    const result = handleStop(input)

    expect(result.decision).toBeUndefined()
  })

  it('handles malformed JSON in transcript lines', () => {
    const transcriptPath = path.join(tempDir, 'malformed.jsonl')
    fs.writeFileSync(
      transcriptPath,
      '{"type":"assistant","message":{"content":"[Mergeable PR] Done."}}\nnot valid json',
    )
    const input = createStopInput(transcriptPath)
    const result = handleStop(input)

    expect(result.decision).toBeUndefined()
  })
})
