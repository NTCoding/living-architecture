import Database from 'better-sqlite3'
import { z } from 'zod'
import { WorkflowError } from '../infra/domain/workflow-error'

const BASE_EVENT_SCHEMA = z
  .object({
    type: z.string(),
    at: z.string(),
  })
  .passthrough()
type BaseEvent = z.infer<typeof BASE_EVENT_SCHEMA>

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS events (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    at TEXT NOT NULL,
    payload TEXT NOT NULL
  )
`

export type SqliteEventStore = {
  readonly readEvents: (sessionId: string) => readonly BaseEvent[]
  readonly appendEvents: (sessionId: string, events: readonly BaseEvent[]) => void
  readonly sessionExists: (sessionId: string) => boolean
  readonly listSessions: () => readonly string[]
  readonly db: Database.Database
}

const ROW_WITH_PAYLOAD_SCHEMA = z.array(z.object({ payload: z.string() }))
const ROW_WITH_SESSION_ID_SCHEMA = z.array(z.object({ session_id: z.string() }))

export function createStore(dbPath: string): SqliteEventStore {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(CREATE_TABLE_SQL)

  return {
    db,

    readEvents(sessionId: string): readonly BaseEvent[] {
      const rawRows = db
        .prepare('SELECT payload FROM events WHERE session_id = ? ORDER BY seq')
        .all(sessionId)
      const rows = ROW_WITH_PAYLOAD_SCHEMA.parse(rawRows)
      return rows.map((row, index) => {
        const parsed: unknown = tryParsePayload(row.payload, index)
        const result = BASE_EVENT_SCHEMA.safeParse(parsed)
        if (!result.success) {
          throw new WorkflowError(
            `Invalid event at index ${index} for session ${sessionId}: ${result.error.message}`,
          )
        }
        return result.data
      })
    },

    appendEvents(sessionId: string, events: readonly BaseEvent[]): void {
      if (events.length === 0) return
      const insert = db.prepare(
        'INSERT INTO events (session_id, type, at, payload) VALUES (?, ?, ?, ?)',
      )
      const transaction = db.transaction((evts: readonly BaseEvent[]) => {
        for (const event of evts) {
          insert.run(sessionId, event.type, event.at, JSON.stringify(event))
        }
      })
      transaction(events)
    },

    sessionExists(sessionId: string): boolean {
      const row = db.prepare('SELECT 1 FROM events WHERE session_id = ? LIMIT 1').get(sessionId)
      return row !== undefined
    },

    listSessions(): readonly string[] {
      const rawRows = db
        .prepare('SELECT session_id FROM events GROUP BY session_id ORDER BY MIN(seq)')
        .all()
      const rows = ROW_WITH_SESSION_ID_SCHEMA.parse(rawRows)
      return rows.map((r) => r.session_id)
    },
  }
}

function tryParsePayload(payload: string, index: number): unknown {
  try {
    return JSON.parse(payload)
  } catch (cause) {
    throw new WorkflowError(`Cannot parse event payload at index ${index}: ${String(cause)}`)
  }
}
