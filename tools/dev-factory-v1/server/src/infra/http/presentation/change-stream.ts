import { statSync } from 'node:fs'

type WatchedFile = {
  readonly path: string
  readonly event: string
}

type ChangeListener = {
  writeHead(status: number, headers: Record<string, string>): void
  write(text: string): void
  on(event: 'close', listener: () => void): void
}

interface Watched {
  readonly key: string
  readonly files: readonly WatchedFile[]
  readonly listeners: Set<ChangeListener>
  readonly times: Map<string, number>
  readonly timer: NodeJS.Timeout
}

type ChangeStreamOptions = {
  readonly checkMilliseconds: number
  readonly log: (text: string) => void
}

/**
 * @riviere-role http-change-stream
 *
 * Tells a browser which of the files it is showing have changed. It looks at the modification time
 * of each file, the way the scratch pad does for its database, because the planning session writes
 * the files and nothing tells the server when it does.
 */
export class FileChangeStreams {
  private readonly watched = new Set<Watched>()

  constructor(private readonly options: ChangeStreamOptions) {}

  open(files: readonly WatchedFile[], listener: ChangeListener): void {
    listener.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
    })
    listener.write(': the changes of these files follow\n\n')
    const watched = this.watchOf(files)
    watched.listeners.add(listener)
    listener.on('close', () => {
      watched.listeners.delete(listener)
      if (watched.listeners.size === 0) this.stop(watched)
    })
  }

  /** Tells every browser which files have changed since the last time it looked. */
  check(): void {
    this.watched.forEach((watched) => {
      try {
        sendChangesOf(watched)
      } catch (error) {
        this.options.log(`The changes of these files couldn't be checked: ${String(error)}`)
      }
    })
  }

  close(): void {
    this.watched.forEach((watched) => this.stop(watched))
  }

  private watchOf(files: readonly WatchedFile[]): Watched {
    const key = files.map((file) => file.path).join('\n')
    const watching = [...this.watched].find((watched) => watched.key === key)
    if (watching !== undefined) return watching
    const watched: Watched = {
      key,
      files,
      listeners: new Set<ChangeListener>(),
      times: timesOf(files),
      timer: setInterval(() => {
        this.check()
      }, this.options.checkMilliseconds),
    }
    this.watched.add(watched)
    return watched
  }

  private stop(watched: Watched): void {
    clearInterval(watched.timer)
    this.watched.delete(watched)
  }
}

function sendChangesOf(watched: Watched): void {
  for (const file of watched.files) {
    const time = timeOf(file.path)
    if (watched.times.get(file.path) === time) continue
    watched.times.set(file.path, time)
    watched.listeners.forEach((listener) =>
      listener.write(`data: ${JSON.stringify({ kind: 'file', file: file.event })}\n\n`),
    )
  }
}

function timesOf(files: readonly WatchedFile[]): Map<string, number> {
  return new Map(files.map((file) => [file.path, timeOf(file.path)]))
}

function timeOf(path: string): number {
  try {
    return statSync(path).mtimeMs
  } catch {
    return 0
  }
}
