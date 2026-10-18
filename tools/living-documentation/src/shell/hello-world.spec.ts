import { afterEach, describe, expect, it, vi } from 'vitest'
import { printHelloWorld } from './hello-world'
import './hello-world-main'

const consoleLogSpy = vi.spyOn(console, 'log')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('hello world entry point', () => {
  it('writes nothing to stdout when the shell modules are imported', () => {
    expect(consoleLogSpy).not.toHaveBeenCalled()
  })

  it('writes exactly hello world to stdout when the greeting is printed', () => {
    const greetingLogSpy = vi.spyOn(console, 'log')
    greetingLogSpy.mockClear()

    printHelloWorld((greeting) => {
      console.log(greeting)
    })

    expect(greetingLogSpy).toHaveBeenCalledTimes(1)
    expect(greetingLogSpy).toHaveBeenCalledWith('hello world')
  })
})
