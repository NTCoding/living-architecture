import {
  describe, it, expect, beforeEach, afterEach 
} from 'vitest'
import {
  getSessionId,
  getPluginRoot,
  getEnvFilePath,
  getDbPath,
  getErrorLogPath,
} from './environment'
import { WorkflowError } from './workflow-error'

describe('environment', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getSessionId', () => {
    it('returns CLAUDE_SESSION_ID when set', () => {
      process.env['CLAUDE_SESSION_ID'] = 'sess-123'
      expect(getSessionId()).toStrictEqual('sess-123')
    })

    it('throws WorkflowError when missing', () => {
      delete process.env['CLAUDE_SESSION_ID']
      expect(() => getSessionId()).toThrow(WorkflowError)
      expect(() => getSessionId()).toThrow('Missing required env var: CLAUDE_SESSION_ID')
    })
  })

  describe('getPluginRoot', () => {
    it('returns CLAUDE_PLUGIN_ROOT when set', () => {
      process.env['CLAUDE_PLUGIN_ROOT'] = '/some/path'
      expect(getPluginRoot()).toStrictEqual('/some/path')
    })

    it('throws WorkflowError when missing', () => {
      delete process.env['CLAUDE_PLUGIN_ROOT']
      expect(() => getPluginRoot()).toThrow(WorkflowError)
      expect(() => getPluginRoot()).toThrow('Missing required env var: CLAUDE_PLUGIN_ROOT')
    })
  })

  describe('getEnvFilePath', () => {
    it('returns CLAUDE_ENV_FILE when set', () => {
      process.env['CLAUDE_ENV_FILE'] = '/env/file'
      expect(getEnvFilePath()).toStrictEqual('/env/file')
    })

    it('throws WorkflowError when missing', () => {
      delete process.env['CLAUDE_ENV_FILE']
      expect(() => getEnvFilePath()).toThrow(WorkflowError)
      expect(() => getEnvFilePath()).toThrow('Missing required env var: CLAUDE_ENV_FILE')
    })
  })

  describe('getDbPath', () => {
    it('returns path under home .claude directory', () => {
      const result = getDbPath()
      expect(result).toMatch(/\.claude\/workflow-events\.db$/)
    })
  })

  describe('getErrorLogPath', () => {
    it('returns path under home .claude directory', () => {
      const result = getErrorLogPath()
      expect(result).toMatch(/\.claude\/dev-workflow-v2-hook-errors\.log$/)
    })
  })
})
