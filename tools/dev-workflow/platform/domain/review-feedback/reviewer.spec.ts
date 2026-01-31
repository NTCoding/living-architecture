import {
  describe, it, expect 
} from 'vitest'
import { Reviewer } from './reviewer'

describe('Reviewer', () => {
  describe('createFromGitHubLogin', () => {
    it('creates reviewer from valid login', () => {
      const reviewer = Reviewer.createFromGitHubLogin('octocat')
      expect(reviewer.value).toBe('octocat')
    })

    it('creates placeholder reviewer when login is null', () => {
      const reviewer = Reviewer.createFromGitHubLogin(null)
      expect(reviewer.value).toBe('[deleted]')
    })

    it('creates placeholder reviewer when login is undefined', () => {
      const reviewer = Reviewer.createFromGitHubLogin(undefined)
      expect(reviewer.value).toBe('[deleted]')
    })
  })

  describe('toString', () => {
    it('returns login value', () => {
      const reviewer = Reviewer.createFromGitHubLogin('octocat')
      expect(reviewer.toString()).toBe('octocat')
    })
  })

  describe('value', () => {
    it('returns login value', () => {
      const reviewer = Reviewer.createFromGitHubLogin('octocat')
      expect(reviewer.value).toBe('octocat')
    })
  })
})
