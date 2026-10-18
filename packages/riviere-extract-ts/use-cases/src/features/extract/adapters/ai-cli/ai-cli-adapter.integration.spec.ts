import { describe, expect, it } from 'vitest'
import { AiCliAdapter } from './ai-cli-adapter'
import { ChildProcessClient } from '../../../../infra/external-clients/child-process/child-process-client'

const echoStandardInput = 'process.stdin.pipe(process.stdout)'
const printFirstArgument = 'process.stdout.write(process.argv[1])'
const waitForever = 'setTimeout(() => {}, 30000)'

function createAdapter(): AiCliAdapter {
  return new AiCliAdapter(new ChildProcessClient())
}

describe('AiCliAdapter ai-cli integration with a stub executable', () => {
  it('invokes the executable and returns the standard output for a standard input prompt', async () => {
    const result = await createAdapter().run({
      command: process.execPath,
      args: ['-e', echoStandardInput],
      prompt: 'explain the graph',
      timeoutMilliseconds: 10_000,
    })

    expect(result).toStrictEqual({
      kind: 'completed',
      standardOutput: 'explain the graph',
      standardError: '',
    })
  })

  it('substitutes the single prompt placeholder into the executable arguments', async () => {
    const result = await createAdapter().run({
      command: process.execPath,
      args: ['-e', printFirstArgument, '{prompt}'],
      prompt: 'substituted prompt',
      timeoutMilliseconds: 10_000,
    })

    expect(result).toStrictEqual({
      kind: 'completed',
      standardOutput: 'substituted prompt',
      standardError: '',
    })
  })

  it('kills the executable and reports a timeout when it does not finish', async () => {
    const result = await createAdapter().run({
      command: process.execPath,
      args: ['-e', waitForever],
      prompt: 'never read',
      timeoutMilliseconds: 100,
    })

    expect(result).toStrictEqual({ kind: 'timed-out', timeoutMilliseconds: 100 })
  })

  it('reports an available executable without leaving a process running', async () => {
    const availability = await createAdapter().checkAvailability(process.execPath)

    expect(availability).toStrictEqual({ kind: 'available' })
  })

  it('reports an unavailable executable when the command does not exist', async () => {
    const availability = await createAdapter().checkAvailability(
      'riviere-ai-cli-command-that-does-not-exist',
    )

    expect(availability).toMatchObject({ kind: 'unavailable' })
  })

  it('completes when the executable exits before reading a large standard input prompt', async () => {
    const result = await createAdapter().run({
      command: process.execPath,
      args: ['-e', 'process.exit(0)'],
      prompt: 'x'.repeat(1024 * 1024),
      timeoutMilliseconds: 10_000,
    })

    expect(result).toStrictEqual({
      kind: 'completed',
      standardOutput: '',
      standardError: '',
    })
  })
})
