import {
  describe, it, expect, beforeEach, afterEach 
} from 'vitest'
import { cli } from './cli-args'

describe('cli', () => {
  const originalArgv = process.argv

  afterEach(() => {
    process.argv = originalArgv
  })

  describe('parseArg', () => {
    it('returns value for existing flag', () => {
      process.argv = ['node', 'script', '--name', 'value']

      expect(cli.parseArg('--name')).toStrictEqual('value')
    })

    it('returns undefined for missing flag', () => {
      process.argv = ['node', 'script']

      expect(cli.parseArg('--missing')).toBeUndefined()
    })

    it('returns undefined when flag is last element', () => {
      process.argv = ['node', 'script', '--flag']

      expect(cli.parseArg('--flag')).toBeUndefined()
    })

    it('returns correct value with multiple flags', () => {
      process.argv = ['node', 'script', '--first', 'a', '--second', 'b']

      expect(cli.parseArg('--second')).toStrictEqual('b')
    })
  })

  describe('requireArg', () => {
    beforeEach(() => {
      process.argv = ['node', 'script', '--required', 'present']
    })

    it('returns value when flag present', () => {
      expect(cli.requireArg('--required')).toStrictEqual('present')
    })

    it('throws WorkflowError when flag missing', () => {
      expect(() => cli.requireArg('--missing')).toThrow('--missing is required')
    })
  })

  describe('hasFlag', () => {
    it('returns true when flag present', () => {
      process.argv = ['node', 'script', '--verbose']

      expect(cli.hasFlag('--verbose')).toStrictEqual(true)
    })

    it('returns false when flag absent', () => {
      process.argv = ['node', 'script']

      expect(cli.hasFlag('--verbose')).toStrictEqual(false)
    })
  })
})
