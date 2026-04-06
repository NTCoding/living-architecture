import {
  describe, it, expect, vi 
} from 'vitest'

const { mockReaddirSync } = vi.hoisted(() => ({ mockReaddirSync: vi.fn<() => string[]>() }))

vi.mock('node:fs', () => ({ readdirSync: mockReaddirSync }))

import { findActivePrdMilestones } from './active-prd-milestones'

describe('findActivePrdMilestones', () => {
  it('extracts milestone names from PRD filenames', () => {
    mockReaddirSync.mockReturnValue([
      'PRD-phase-11-metadata-extraction.md',
      'PRD-phase-12-ui-redesign.md',
    ])

    const result = findActivePrdMilestones('/some/prd/dir')

    expect(result).toStrictEqual(['phase-11-metadata-extraction', 'phase-12-ui-redesign'])
  })

  it('ignores non-PRD files', () => {
    mockReaddirSync.mockReturnValue(['PRD-phase-11.md', 'README.md', 'notes.txt'])

    const result = findActivePrdMilestones('/some/prd/dir')

    expect(result).toStrictEqual(['phase-11'])
  })

  it('returns empty array when directory does not exist', () => {
    mockReaddirSync.mockImplementation(() => {
      const error = Object.assign(new RangeError('ENOENT: no such file or directory'), {code: 'ENOENT',})
      throw error
    })

    const result = findActivePrdMilestones('/nonexistent')

    expect(result).toStrictEqual([])
  })

  it('returns empty array when no PRD files exist', () => {
    mockReaddirSync.mockReturnValue([])

    const result = findActivePrdMilestones('/empty/dir')

    expect(result).toStrictEqual([])
  })
})
