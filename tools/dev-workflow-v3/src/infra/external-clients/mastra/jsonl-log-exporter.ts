import { appendFile } from 'node:fs/promises'
import type { LogEvent } from '@mastra/core/observability'

/**
 * Appends every observability log event as one JSON line so logs survive even when the
 * storage adapter cannot persist them.
 *
 * @riviere-role external-client-service
 */
export class JsonlLogExporter implements ObservabilityExporter {
  readonly name = 'jsonl-log-exporter'

  readonly #filePath: string

  constructor(filePath: string) {
    this.#filePath = filePath
  }

  async onLogEvent(event: LogEvent): Promise<void> {
    await appendFile(this.#filePath, `${JSON.stringify(event)}\n`, 'utf8')
  }

  exportTracingEvent(): Promise<void> {
    return Promise.resolve()
  }

  flush(): Promise<void> {
    return Promise.resolve()
  }

  shutdown(): Promise<void> {
    return Promise.resolve()
  }
}
