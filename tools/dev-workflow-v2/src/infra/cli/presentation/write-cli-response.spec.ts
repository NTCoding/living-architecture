import { afterEach, describe, expect, it, vi } from 'vitest'
import { writeCliResponse } from './write-cli-response'

afterEach(() => {
  process.exitCode = undefined
  vi.restoreAllMocks()
})

describe('writeCliResponse', () => {
  it('writes a successful response to standard output', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)

    writeCliResponse({ message: 'prepared\n', stream: 'stdout' })

    expect({ calls: write.mock.calls, exitCode: process.exitCode }).toStrictEqual({
      calls: [['prepared\n']],
      exitCode: undefined,
    })
  })

  it('writes a failed response to standard error and records its exit code', () => {
    const write = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)

    writeCliResponse({ exitCode: 1, message: 'failed\n', stream: 'stderr' })

    expect({ calls: write.mock.calls, exitCode: process.exitCode }).toStrictEqual({
      calls: [['failed\n']],
      exitCode: 1,
    })
  })
})
