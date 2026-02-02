import {
  describe, it, expect 
} from 'vitest'
import {
  removeWorktreeFromSettings,
  settingsSchema,
  type ClaudeSettings,
} from './worktree-operations'

describe('removeWorktreeFromSettings', () => {
  it('removes matching worktree path from additionalDirectories', () => {
    const settings: ClaudeSettings = {permissions: { additionalDirectories: ['/home/user/worktree-1', '/home/user/worktree-2'] },}

    const result = removeWorktreeFromSettings(settings, '/home/user/worktree-1')

    expect(result.permissions?.additionalDirectories).toStrictEqual(['/home/user/worktree-2'])
  })

  it('returns settings unchanged when no permissions exist', () => {
    const settings: ClaudeSettings = {}

    const result = removeWorktreeFromSettings(settings, '/home/user/worktree')

    expect(result).toStrictEqual({})
  })

  it('returns settings unchanged when no additionalDirectories exist', () => {
    const settings: ClaudeSettings = { permissions: {} }

    const result = removeWorktreeFromSettings(settings, '/home/user/worktree')

    expect(result).toStrictEqual({ permissions: {} })
  })

  it('returns empty array when removing the only directory', () => {
    const settings: ClaudeSettings = {permissions: { additionalDirectories: ['/home/user/worktree'] },}

    const result = removeWorktreeFromSettings(settings, '/home/user/worktree')

    expect(result.permissions?.additionalDirectories).toStrictEqual([])
  })

  it('does not mutate the original settings', () => {
    const original: ClaudeSettings = {permissions: { additionalDirectories: ['/home/user/worktree'] },}

    removeWorktreeFromSettings(original, '/home/user/worktree')

    expect(original.permissions?.additionalDirectories).toStrictEqual(['/home/user/worktree'])
  })
})

describe('settingsSchema', () => {
  it('parses valid settings with permissions', () => {
    const input = { permissions: { additionalDirectories: ['/path'] } }

    const result = settingsSchema.safeParse(input)

    expect(result.success).toBe(true)
  })

  it('parses empty object', () => {
    const result = settingsSchema.safeParse({})

    expect(result.success).toBe(true)
  })

  it('rejects non-object input', () => {
    const result = settingsSchema.safeParse('not an object')

    expect(result.success).toBe(false)
  })
})
