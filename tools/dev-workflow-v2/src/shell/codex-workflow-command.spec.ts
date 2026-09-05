import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const shellDirectory = dirname(fileURLToPath(import.meta.url))
const workflowCommandPath = join(shellDirectory, '../../dist/codex-workflow-command.js')
const codexCliPath = join(shellDirectory, '../../dist/codex-cli.js')
const unknownCommandMessage = [
  '[dev-workflow-v2-automated-message]: Error: You tried to run a command that does not exist. STOP working immediately and switch to BLOCKED. Report this to the user along with a root cause analysis of why you tried to run a command that does not exist.',
  'STOP and fix the workflow. It is broken. Do not attempt to create a workaround. YOU must immediately switch to blocked and stop.',
].join('\n\n')

describe('Codex workflow command', () => {
  it('loads the compiled workflow command without source resolution', () => {
    const result = spawnSync(process.execPath, [workflowCommandPath], {
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '' },
    })

    expect(result.stderr).toContain('Codex workflow command requires <operation> [args]')
    expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND')
  })

  it('returns the workflow recovery instructions when the operation does not exist', () => {
    const home = mkdtempSync(join(tmpdir(), 'codex-workflow-command-'))
    const result = spawnSync(process.execPath, [workflowCommandPath, 'missing-operation'], {
      encoding: 'utf8',
      env: {
        ...process.env,
        CODEX_THREAD_ID: 'test-session',
        HOME: home,
        NODE_OPTIONS: '',
        WORKFLOW_EVENTS_DB: join(home, 'workflow-events.db'),
      },
    })

    try {
      expect(result.status).toBe(1)
      expect(result.stdout).toBe(unknownCommandMessage)
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })

  it('provides stdin to reflection commands without patching the Codex package', () => {
    const home = mkdtempSync(join(tmpdir(), 'codex-workflow-command-'))
    const codexHome = join(home, '.codex')
    const transcriptDirectory = join(codexHome, 'sessions', '2026', '09', '04')
    const transcriptPath = join(
      transcriptDirectory,
      'rollout-2026-09-04T18-00-00-test-session.jsonl',
    )
    const environment = {
      ...process.env,
      CODEX_HOME: codexHome,
      CODEX_THREAD_ID: 'test-session',
      HOME: home,
      NODE_OPTIONS: '',
      WORKFLOW_EVENTS_DB: join(home, 'workflow-events.db'),
    }

    try {
      mkdirSync(transcriptDirectory, { recursive: true })
      writeFileSync(transcriptPath, '{}\n')
      const startResult = spawnSync(process.execPath, [codexCliPath], {
        cwd: join(shellDirectory, '../../../..'),
        encoding: 'utf8',
        env: environment,
        input: JSON.stringify({
          session_id: 'test-session',
          transcript_path: transcriptPath,
          cwd: join(shellDirectory, '../../../..'),
          hook_event_name: 'SessionStart',
        }),
      })
      const reflectionResult = spawnSync(
        process.execPath,
        [workflowCommandPath, 'record-reflection'],
        {
          encoding: 'utf8',
          env: environment,
          input: JSON.stringify({ summary: 'Reflection input', findings: [] }),
        },
      )

      expect(startResult.status).toBe(0)
      expect(reflectionResult.status).toBe(0)
      expect(JSON.parse(reflectionResult.stdout)).toMatchObject({
        ok: true,
        sessionId: 'test-session',
      })
    } finally {
      rmSync(home, { recursive: true, force: true })
    }
  })
})
