import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FileChangeStreams } from './change-stream'

class BrowserGone extends Error {
  constructor() {
    super('The browser is gone.')
    this.name = 'BrowserGone'
  }
}

type FakeListener = {
  readonly written: string[]
  readonly status: number[]
  close: () => void
  failNextWrite: boolean
  writeHead: (status: number, headers: Record<string, string>) => void
  write: (text: string) => void
  on: (event: 'close', listener: () => void) => void
}

function fakeListener(): FakeListener {
  const closers: (() => void)[] = []
  const listener: FakeListener = {
    written: [],
    status: [],
    failNextWrite: false,
    writeHead: (status: number) => listener.status.push(status),
    write: (text: string) => {
      if (listener.failNextWrite) throw new BrowserGone()
      listener.written.push(text)
    },
    on: (_event: 'close', closer: () => void) => closers.push(closer),
    close: () => closers.forEach((closer) => closer()),
  }
  return listener
}

function folderWith(fileName: string): { folder: string; path: string } {
  const folder = mkdtempSync(join(tmpdir(), 'factory-change-'))
  return { folder, path: join(folder, fileName) }
}

describe('FileChangeStreams', () => {
  it('opens the stream with the notes a browser needs', () => {
    const { path } = folderWith('epic.yml')
    writeFileSync(path, 'title: One\n')
    const listener = fakeListener()
    const streams = new FileChangeStreams({ checkMilliseconds: 1000, log: () => undefined })

    streams.open([{ path, event: 'epic' }], listener)

    expect(listener.status).toStrictEqual([200])
    expect(listener.written[0]).toBe(': the changes of these files follow\n\n')
    streams.close()
  })

  it('sends a change when a watched file is written', () => {
    const { path } = folderWith('epic.yml')
    writeFileSync(path, 'title: One\n')
    const listener = fakeListener()
    const streams = new FileChangeStreams({ checkMilliseconds: 1000, log: () => undefined })
    streams.open([{ path, event: 'epic' }], listener)

    writeFileSync(path, 'title: Two\n')
    streams.check()

    expect(listener.written[1]).toBe('data: {"kind":"file","file":"epic"}\n\n')
    streams.close()
  })

  it('sends nothing when no file has changed', () => {
    const { path } = folderWith('epic.yml')
    writeFileSync(path, 'title: One\n')
    const listener = fakeListener()
    const streams = new FileChangeStreams({ checkMilliseconds: 1000, log: () => undefined })
    streams.open([{ path, event: 'epic' }], listener)

    streams.check()

    expect(listener.written).toHaveLength(1)
    streams.close()
  })

  it('sends a change when a watched file appears', () => {
    const { path } = folderWith('epic.yml')
    const listener = fakeListener()
    const streams = new FileChangeStreams({ checkMilliseconds: 1000, log: () => undefined })
    streams.open([{ path, event: 'epic' }], listener)

    writeFileSync(path, 'title: One\n')
    streams.check()

    expect(listener.written[1]).toBe('data: {"kind":"file","file":"epic"}\n\n')
    streams.close()
  })

  it('sends the change to every browser that is watching', () => {
    const { path } = folderWith('epic.yml')
    writeFileSync(path, 'title: One\n')
    const first = fakeListener()
    const second = fakeListener()
    const streams = new FileChangeStreams({ checkMilliseconds: 1000, log: () => undefined })
    streams.open([{ path, event: 'epic' }], first)
    streams.open([{ path, event: 'epic' }], second)

    writeFileSync(path, 'title: Two\n')
    streams.check()

    expect(first.written[1]).toBe('data: {"kind":"file","file":"epic"}\n\n')
    expect(second.written[1]).toBe('data: {"kind":"file","file":"epic"}\n\n')
    streams.close()
  })

  it('logs a browser that cannot be written to, and keeps the others', () => {
    const { path } = folderWith('epic.yml')
    writeFileSync(path, 'title: One\n')
    const logged: string[] = []
    const listener = fakeListener()
    const streams = new FileChangeStreams({
      checkMilliseconds: 1000,
      log: (text) => logged.push(text),
    })
    streams.open([{ path, event: 'epic' }], listener)
    listener.failNextWrite = true

    writeFileSync(path, 'title: Two\n')
    streams.check()

    expect(logged).toStrictEqual([
      "The changes of these files couldn't be checked: BrowserGone: The browser is gone.",
    ])
    streams.close()
  })

  it('keeps watching when 1 of 2 browsers closes', () => {
    const { path } = folderWith('epic.yml')
    writeFileSync(path, 'title: One\n')
    const first = fakeListener()
    const second = fakeListener()
    const streams = new FileChangeStreams({ checkMilliseconds: 1000, log: () => undefined })
    streams.open([{ path, event: 'epic' }], first)
    streams.open([{ path, event: 'epic' }], second)

    first.close()
    writeFileSync(path, 'title: Two\n')
    streams.check()

    expect(second.written[1]).toBe('data: {"kind":"file","file":"epic"}\n\n')
    streams.close()
  })

  it('stops watching when the last browser closes', () => {
    const { path } = folderWith('epic.yml')
    writeFileSync(path, 'title: One\n')
    const listener = fakeListener()
    const streams = new FileChangeStreams({ checkMilliseconds: 5, log: () => undefined })
    streams.open([{ path, event: 'epic' }], listener)

    listener.close()

    expect(listener.written).toHaveLength(1)
    streams.close()
  })
})
