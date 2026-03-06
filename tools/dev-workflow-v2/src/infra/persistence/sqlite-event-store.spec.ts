import {
  describe, it, expect, afterEach 
} from 'vitest'
import {
  unlinkSync, existsSync, mkdtempSync 
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createStore } from './sqlite-event-store'
import type { SqliteEventStore } from './sqlite-event-store'

describe('sqlite-event-store', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'wf-test-'))
  const dbPath = join(tempDir, 'test-events.db')

  afterEach(() => {
    if (existsSync(dbPath)) unlinkSync(dbPath)
    const walPath = `${dbPath}-wal`
    if (existsSync(walPath)) unlinkSync(walPath)
    const shmPath = `${dbPath}-shm`
    if (existsSync(shmPath)) unlinkSync(shmPath)
  })

  function freshStore(): SqliteEventStore {
    return createStore(dbPath)
  }

  describe('createStore', () => {
    it('creates the database and events table', () => {
      const store = freshStore()
      expect(store.db).toBeDefined()
      store.db.close()
    })
  })

  describe('appendEvents + readEvents', () => {
    it('round-trips events for a session', () => {
      const store = freshStore()
      const events = [
        {
          type: 'session-started',
          at: '2024-01-01T00:00:00Z',
        },
        {
          type: 'transitioned',
          at: '2024-01-01T00:01:00Z',
          from: 'IMPLEMENTING',
          to: 'VERIFYING',
        },
      ]
      store.appendEvents('sess-1', events)
      const retrieved = store.readEvents('sess-1')
      expect(retrieved).toHaveLength(2)
      expect(retrieved[0]?.type).toStrictEqual('session-started')
      expect(retrieved[1]?.type).toStrictEqual('transitioned')
      store.db.close()
    })

    it('returns empty array for unknown session', () => {
      const store = freshStore()
      expect(store.readEvents('nonexistent')).toHaveLength(0)
      store.db.close()
    })

    it('does nothing when appending empty array', () => {
      const store = freshStore()
      store.appendEvents('sess-1', [])
      expect(store.readEvents('sess-1')).toHaveLength(0)
      store.db.close()
    })

    it('isolates events between sessions', () => {
      const store = freshStore()
      store.appendEvents('sess-1', [
        {
          type: 'session-started',
          at: '2024-01-01T00:00:00Z',
        },
      ])
      store.appendEvents('sess-2', [
        {
          type: 'transitioned',
          at: '2024-01-01T00:01:00Z',
          from: 'A',
          to: 'B',
        },
      ])
      expect(store.readEvents('sess-1')).toHaveLength(1)
      expect(store.readEvents('sess-2')).toHaveLength(1)
      expect(store.readEvents('sess-1')[0]?.type).toStrictEqual('session-started')
      expect(store.readEvents('sess-2')[0]?.type).toStrictEqual('transitioned')
      store.db.close()
    })
  })

  describe('sessionExists', () => {
    it('returns false for non-existent session', () => {
      const store = freshStore()
      expect(store.sessionExists('nope')).toStrictEqual(false)
      store.db.close()
    })

    it('returns true after events are appended', () => {
      const store = freshStore()
      store.appendEvents('sess-1', [
        {
          type: 'session-started',
          at: '2024-01-01T00:00:00Z',
        },
      ])
      expect(store.sessionExists('sess-1')).toStrictEqual(true)
      store.db.close()
    })
  })

  describe('listSessions', () => {
    it('returns empty array when no sessions exist', () => {
      const store = freshStore()
      expect(store.listSessions()).toHaveLength(0)
      store.db.close()
    })

    it('returns session IDs in insertion order', () => {
      const store = freshStore()
      store.appendEvents('sess-a', [
        {
          type: 'session-started',
          at: '2024-01-01T00:00:00Z',
        },
      ])
      store.appendEvents('sess-b', [
        {
          type: 'session-started',
          at: '2024-01-01T00:01:00Z',
        },
      ])
      const sessions = store.listSessions()
      expect(sessions).toStrictEqual(['sess-a', 'sess-b'])
      store.db.close()
    })
  })

  describe('error handling', () => {
    it('throws on invalid event payload JSON in database', () => {
      const store = freshStore()
      store.db
        .prepare('INSERT INTO events (session_id, type, at, payload) VALUES (?, ?, ?, ?)')
        .run('sess-err', 'test', '2024-01-01', '{invalid json')
      expect(() => store.readEvents('sess-err')).toThrow('Cannot parse event payload')
      store.db.close()
    })

    it('throws on event missing required fields', () => {
      const store = freshStore()
      store.db
        .prepare('INSERT INTO events (session_id, type, at, payload) VALUES (?, ?, ?, ?)')
        .run('sess-err', 'test', '2024-01-01', '{"foo":"bar"}')
      expect(() => store.readEvents('sess-err')).toThrow('Invalid event at index 0')
      store.db.close()
    })
  })
})
