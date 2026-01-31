import {
  describe, it, expect 
} from 'vitest'
import {
  createFeedbackLocation, formatFeedbackLocation 
} from './feedback-location'

describe('createFeedbackLocation', () => {
  it('creates pr-level location when file is null', () => {
    const location = createFeedbackLocation(null, null)
    expect(location).toStrictEqual({ type: 'pr-level' })
  })

  it('creates pr-level location when file is undefined', () => {
    const location = createFeedbackLocation(undefined, undefined)
    expect(location).toStrictEqual({ type: 'pr-level' })
  })

  it('creates file-level location when file provided but no line', () => {
    const location = createFeedbackLocation('src/file.ts', null)
    expect(location).toStrictEqual({
      type: 'file-level',
      file: 'src/file.ts',
    })
  })

  it('creates file-level location when line is undefined', () => {
    const location = createFeedbackLocation('src/file.ts', undefined)
    expect(location).toStrictEqual({
      type: 'file-level',
      file: 'src/file.ts',
    })
  })

  it('creates line-level location when file and line provided', () => {
    const location = createFeedbackLocation('src/file.ts', 42)
    expect(location).toStrictEqual({
      type: 'line-level',
      file: 'src/file.ts',
      line: 42,
    })
  })
})

describe('formatFeedbackLocation', () => {
  it('formats pr-level location', () => {
    const result = formatFeedbackLocation({ type: 'pr-level' })
    expect(result).toBe('PR-level')
  })

  it('formats file-level location', () => {
    const result = formatFeedbackLocation({
      type: 'file-level',
      file: 'src/file.ts',
    })
    expect(result).toBe('src/file.ts')
  })

  it('formats line-level location', () => {
    const result = formatFeedbackLocation({
      type: 'line-level',
      file: 'src/file.ts',
      line: 42,
    })
    expect(result).toBe('src/file.ts:42')
  })
})
