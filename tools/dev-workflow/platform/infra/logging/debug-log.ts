import {
  appendFileSync, mkdirSync 
} from 'node:fs'
import { dirname } from 'node:path'
import { type DebugLog } from '../../domain/debug-log'

const startTime = Date.now()

function elapsed(): string {
  const ms = Date.now() - startTime
  const seconds = (ms / 1000).toFixed(1)
  return `+${seconds}s`
}

function timestamp(): string {
  return new Date().toISOString()
}

export function createDebugLog(filePath: string): DebugLog {
  mkdirSync(dirname(filePath), { recursive: true })
  appendFileSync(filePath, `\n--- debug session ${timestamp()} ---\n`)

  return {
    log(message: string): void {
      const line = `[${timestamp()}] [${elapsed()}] ${message}\n`
      appendFileSync(filePath, line)
    },
  }
}
