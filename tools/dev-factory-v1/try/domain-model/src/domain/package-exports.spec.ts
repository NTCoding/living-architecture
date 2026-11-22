import { describe, expect, it } from 'vitest'
import * as domainModel from '../index'

describe('the package exports', () => {
  it('exposes the domain model from the package root', () => {
    expect(Object.keys(domainModel)).toContain('ReviewCycle')
  })
})
