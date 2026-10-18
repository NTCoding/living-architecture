import { afterEach, describe, expect, it, vi } from 'vitest'
import { printHelloWorld } from './hello-world'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hello world greeting', () => {
  it('writes hello world to stdout when invoked', () => {
    const stdoutWrites: unknown[] = []
    vi.spyOn(console, 'log').mockImplementation((...values: unknown[]) => {
      stdoutWrites.push(...values)
    })

    printHelloWorld()

    expect(stdoutWrites).toStrictEqual(['hello world'])
  })
})
