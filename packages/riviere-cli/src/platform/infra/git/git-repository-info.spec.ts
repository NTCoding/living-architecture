import {
  describe, it, expect 
} from 'vitest'
import { getRepositoryInfo } from './git-repository-info'

describe('getRepositoryInfo', () => {
  describe('SSH URLs', () => {
    it('parses SSH URL with .git extension', () => {
      const executor = () => 'git@github.com:owner/repo.git'
      const result = getRepositoryInfo('git', '/test/dir', executor)

      expect(result).toStrictEqual({
        name: 'owner/repo',
        owner: 'owner',
        url: 'git@github.com:owner/repo.git',
      })
    })

    it('parses SSH URL without .git extension', () => {
      const executor = () => 'git@github.com:owner/repo'
      const result = getRepositoryInfo('git', '/test/dir', executor)

      expect(result).toStrictEqual({
        name: 'owner/repo',
        owner: 'owner',
        url: 'git@github.com:owner/repo',
      })
    })
  })

  describe('HTTPS URLs', () => {
    it('parses HTTPS URL with .git extension', () => {
      const executor = () => 'https://github.com/owner/repo.git'
      const result = getRepositoryInfo('git', '/test/dir', executor)

      expect(result).toStrictEqual({
        name: 'owner/repo',
        owner: 'owner',
        url: 'https://github.com/owner/repo.git',
      })
    })

    it('parses HTTPS URL without .git extension', () => {
      const executor = () => 'https://github.com/owner/repo'
      const result = getRepositoryInfo('git', '/test/dir', executor)

      expect(result).toStrictEqual({
        name: 'owner/repo',
        owner: 'owner',
        url: 'https://github.com/owner/repo',
      })
    })
  })

  describe('fallback for unparseable URLs', () => {
    it('returns URL as name when format is unrecognized', () => {
      const executor = () => 'file:///local/path'
      const result = getRepositoryInfo('git', '/test/dir', executor)

      expect(result).toStrictEqual({
        name: 'file:///local/path',
        url: 'file:///local/path',
      })
    })
  })
})
