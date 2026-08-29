import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const shellDirectory = dirname(fileURLToPath(import.meta.url))
const workflowCommandPath = join(shellDirectory, '../../dist/codex-workflow-command.js')

describe('Codex workflow command', () => {
  it('loads the compiled workflow command without source resolution', () => {
    const result = spawnSync(process.execPath, [workflowCommandPath], {
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '' },
    })

    expect(result.stderr).toContain('Codex workflow command requires <operation> [args]')
    expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND')
  })
})
