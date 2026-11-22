import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SpanType, TracingEventType } from '@mastra/core/observability'
import type { LogEvent, TracingEvent } from '@mastra/core/observability'
import { JsonlLogExporter } from './jsonl-log-exporter'

function logEventWith(logId: string, message: string): LogEvent {
  return {
    type: 'log',
    log: { logId, timestamp: new Date(0), level: 'info', message },
  }
}

function endedSpanTracingEvent(spanId: string): TracingEvent {
  return {
    type: TracingEventType.SPAN_ENDED,
    exportedSpan: {
      id: spanId,
      traceId: 'a'.repeat(32),
      name: 'test span',
      type: SpanType.AGENT_RUN,
      startTime: new Date(0),
      isRootSpan: true,
      isEvent: false,
    },
  }
}

describe('JsonlLogExporter', () => {
  it('appends each log event as one JSON line', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'jsonl-log-exporter-'))
    const filePath = join(directory, 'mastra-logs.jsonl')
    const exporter = new JsonlLogExporter(filePath)

    await exporter.onLogEvent(logEventWith('log-1', 'first message'))
    await exporter.onLogEvent(logEventWith('log-2', 'second message'))

    const lines = readFileSync(filePath, 'utf8').trim().split('\n')
    expect(lines).toStrictEqual([
      JSON.stringify({
        type: 'log',
        log: {
          logId: 'log-1',
          timestamp: '1970-01-01T00:00:00.000Z',
          level: 'info',
          message: 'first message',
        },
      }),
      JSON.stringify({
        type: 'log',
        log: {
          logId: 'log-2',
          timestamp: '1970-01-01T00:00:00.000Z',
          level: 'info',
          message: 'second message',
        },
      }),
    ])
  })

  it('creates the log file on the first log event', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'jsonl-log-exporter-'))
    const filePath = join(directory, 'mastra-logs.jsonl')
    const exporter = new JsonlLogExporter(filePath)

    await exporter.onLogEvent(logEventWith('log-1', 'first message'))

    expect(readFileSync(filePath, 'utf8')).toContain('first message')
  })

  it('exposes its name for the observability pipeline', () => {
    const directory = mkdtempSync(join(tmpdir(), 'jsonl-log-exporter-'))
    const exporter = new JsonlLogExporter(join(directory, 'mastra-logs.jsonl'))

    expect(exporter.name).toBe('jsonl-log-exporter')
  })

  it('completes flush and shutdown without work', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'jsonl-log-exporter-'))
    const exporter = new JsonlLogExporter(join(directory, 'mastra-logs.jsonl'))

    await expect(exporter.flush()).resolves.toBeUndefined()
    await expect(exporter.shutdown()).resolves.toBeUndefined()
  })

  it('ignores tracing events because the storage exporter already persists them', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'jsonl-log-exporter-'))
    const filePath = join(directory, 'mastra-logs.jsonl')
    const exporter = new JsonlLogExporter(filePath)

    await exporter.exportTracingEvent(endedSpanTracingEvent('span-1'))

    expect(readdirSync(directory)).toStrictEqual([])
  })
})
