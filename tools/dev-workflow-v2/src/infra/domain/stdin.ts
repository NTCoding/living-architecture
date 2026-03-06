import { readFileSync } from 'node:fs'

/* v8 ignore start */
export function readStdinSync(): string {
  return readFileSync(0, 'utf-8')
}
/* v8 ignore stop */
