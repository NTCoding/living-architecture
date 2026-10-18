import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NodeChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'
import { AiCliAdapter } from './ai-cli-adapter'

const recordingStub = [
  "import { writeFileSync } from 'node:fs'",
  'const [recordPath, ...args] = process.argv.slice(2)',
  "let input = ''",
  "process.stdin.setEncoding('utf8')",
  "process.stdin.on('data', (chunk) => { input += chunk })",
  "process.stdin.on('end', () => {",
  '  writeFileSync(recordPath, JSON.stringify({ args, input }))',
  '  process.stdout.write(`handled:${input}`)',
  '})',
].join('\n')

const sleepingStub = [
  "import { writeFileSync } from 'node:fs'",
  'const [pidPath] = process.argv.slice(2)',
  'writeFileSync(pidPath, String(process.pid))',
  'setTimeout(() => {}, 30000)',
].join('\n')

type RecordedInvocation = Readonly<{ args: readonly string[]; input: string }>

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

describe('AiCliAdapter over a stub executable', () => {
  const workspace = { directory: '' }

  beforeEach(async () => {
    workspace.directory = await mkdtemp(join(tmpdir(), 'riviere-ai-cli-'))
  })

  afterEach(async () => {
    await rm(workspace.directory, { force: true, recursive: true })
  })

  it('invokes the configured executable with the configured arguments and stdin prompt', async () => {
    const recordPath = join(workspace.directory, 'record.json')
    const stubPath = join(workspace.directory, 'record.mjs')
    await writeFile(stubPath, recordingStub, 'utf8')
    const subject = new AiCliAdapter(new NodeChildProcessClient())

    const result = await subject.run({
      command: process.execPath,
      args: [stubPath, recordPath, '--mode', 'extract'],
      prompt: 'Architecture prompt',
      timeoutMilliseconds: 5_000,
    })

    const recorded: RecordedInvocation = JSON.parse(await readFile(recordPath, 'utf8'))
    expect(recorded).toStrictEqual({ args: ['--mode', 'extract'], input: 'Architecture prompt' })
    expect(result).toStrictEqual({
      kind: 'completed',
      stdout: { text: 'handled:Architecture prompt', truncated: false },
      stderr: { text: '', truncated: false },
    })
  })

  it('substitutes the prompt into the single placeholder argument and writes no stdin', async () => {
    const recordPath = join(workspace.directory, 'record.json')
    const stubPath = join(workspace.directory, 'record.mjs')
    await writeFile(stubPath, recordingStub, 'utf8')
    const subject = new AiCliAdapter(new NodeChildProcessClient())

    await subject.run({
      command: process.execPath,
      args: [stubPath, recordPath, '--prompt', '{prompt}'],
      prompt: 'Architecture prompt',
      timeoutMilliseconds: 5_000,
    })

    const recorded: RecordedInvocation = JSON.parse(await readFile(recordPath, 'utf8'))
    expect(recorded).toStrictEqual({ args: ['--prompt', 'Architecture prompt'], input: '' })
  })

  it('kills the stub executable and reports a timeout when it exceeds its budget', async () => {
    const pidPath = join(workspace.directory, 'pid.txt')
    const stubPath = join(workspace.directory, 'sleep.mjs')
    await writeFile(stubPath, sleepingStub, 'utf8')
    const subject = new AiCliAdapter(new NodeChildProcessClient())

    const result = await subject.run({
      command: process.execPath,
      args: [stubPath, pidPath],
      prompt: 'Architecture prompt',
      timeoutMilliseconds: 200,
    })

    const pid = Number(await readFile(pidPath, 'utf8'))
    expect(result).toStrictEqual({
      kind: 'timed-out',
      timeoutMilliseconds: 200,
      stdout: { text: '', truncated: false },
      stderr: { text: '', truncated: false },
    })
    expect(processIsAlive(pid)).toBe(false)
  })
})
