import {
  describe, it, expect, beforeEach, vi 
} from 'vitest'
import {
  renderHook, act 
} from '@testing-library/react'
import { z } from 'zod'
import { useCodeLinkSettings } from './use-code-link-settings'

const storedSettingsSchema = z.object({
  vscodePath: z.string().nullable(),
  githubOrg: z.string().nullable(),
  githubBranch: z.string(),
})

const STORAGE_KEY = 'eclair-code-link-settings'

describe('useCodeLinkSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('returns null values when localStorage is empty', () => {
      const { result } = renderHook(() => useCodeLinkSettings())

      expect(result.current.settings.vscodePath).toBeNull()
      expect(result.current.settings.githubOrg).toBeNull()
      expect(result.current.settings.githubBranch).toBe('main')
    })

    it('loads existing settings from localStorage', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          vscodePath: '/Users/test/code',
          githubOrg: 'https://github.com/myorg',
          githubBranch: 'develop',
        }),
      )

      const { result } = renderHook(() => useCodeLinkSettings())

      expect(result.current.settings.vscodePath).toBe('/Users/test/code')
      expect(result.current.settings.githubOrg).toBe('https://github.com/myorg')
      expect(result.current.settings.githubBranch).toBe('develop')
    })
  })

  describe('setVscodePath', () => {
    it('updates vscodePath and persists to localStorage', () => {
      const { result } = renderHook(() => useCodeLinkSettings())

      act(() => {
        result.current.setVscodePath('/Users/nicko/projects')
      })

      expect(result.current.settings.vscodePath).toBe('/Users/nicko/projects')

      const stored = storedSettingsSchema.parse(
        JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'),
      )
      expect(stored.vscodePath).toBe('/Users/nicko/projects')
    })
  })

  describe('setGithubOrg', () => {
    it('updates githubOrg and persists to localStorage', () => {
      const { result } = renderHook(() => useCodeLinkSettings())

      act(() => {
        result.current.setGithubOrg('https://github.com/myorg')
      })

      expect(result.current.settings.githubOrg).toBe('https://github.com/myorg')

      const stored = storedSettingsSchema.parse(
        JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'),
      )
      expect(stored.githubOrg).toBe('https://github.com/myorg')
    })
  })

  describe('setGithubBranch', () => {
    it('updates githubBranch and persists to localStorage', () => {
      const { result } = renderHook(() => useCodeLinkSettings())

      act(() => {
        result.current.setGithubBranch('feature/test')
      })

      expect(result.current.settings.githubBranch).toBe('feature/test')

      const stored = storedSettingsSchema.parse(
        JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'),
      )
      expect(stored.githubBranch).toBe('feature/test')
    })
  })

  describe('buildVscodeUrl', () => {
    it('returns null when vscodePath is not set', () => {
      const { result } = renderHook(() => useCodeLinkSettings())

      expect(result.current.buildVscodeUrl('src/file.ts', 42)).toBeNull()
    })

    it('builds correct vscode URL when path is set', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          vscodePath: '/Users/test/code',
          githubOrg: null,
          githubBranch: 'main',
        }),
      )

      const { result } = renderHook(() => useCodeLinkSettings())

      expect(result.current.buildVscodeUrl('src/file.ts', 42)).toBe(
        'vscode://file//Users/test/code/src/file.ts:42',
      )
    })
  })

  describe('buildGithubUrl', () => {
    it('returns null when githubOrg is not set', () => {
      const { result } = renderHook(() => useCodeLinkSettings())

      expect(result.current.buildGithubUrl('my-repo', 'src/file.ts', 42)).toBeNull()
    })

    it('builds correct GitHub URL with org and repository', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          vscodePath: null,
          githubOrg: 'https://github.com/myorg',
          githubBranch: 'main',
        }),
      )

      const { result } = renderHook(() => useCodeLinkSettings())

      expect(result.current.buildGithubUrl('my-repo', 'src/file.ts', 42)).toBe(
        'https://github.com/myorg/my-repo/blob/main/src/file.ts#L42',
      )
    })

    it('uses configured branch in URL', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          vscodePath: null,
          githubOrg: 'https://github.com/myorg',
          githubBranch: 'develop',
        }),
      )

      const { result } = renderHook(() => useCodeLinkSettings())

      expect(result.current.buildGithubUrl('my-repo', 'src/file.ts', 10)).toBe(
        'https://github.com/myorg/my-repo/blob/develop/src/file.ts#L10',
      )
    })

    it('strips trailing slash from githubOrg', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          vscodePath: null,
          githubOrg: 'https://github.com/myorg/',
          githubBranch: 'main',
        }),
      )

      const { result } = renderHook(() => useCodeLinkSettings())

      expect(result.current.buildGithubUrl('my-repo', 'src/file.ts', 1)).toBe(
        'https://github.com/myorg/my-repo/blob/main/src/file.ts#L1',
      )
    })
  })

  describe('pre-configured settings', () => {
    it('reads GitHub settings from localStorage when pre-configured', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          vscodePath: null,
          githubOrg: 'https://github.com/NTCoding',
          githubBranch: 'main',
        }),
      )

      const { result } = renderHook(() => useCodeLinkSettings())

      expect(result.current.settings.githubOrg).toBe('https://github.com/NTCoding')
      expect(result.current.settings.githubBranch).toBe('main')
    })

    it('builds GitHub URL when settings are pre-configured', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          vscodePath: null,
          githubOrg: 'https://github.com/NTCoding',
          githubBranch: 'main',
        }),
      )

      const { result } = renderHook(() => useCodeLinkSettings())

      expect(result.current.buildGithubUrl('ecommerce-demo-app', 'src/file.ts', 42)).toBe(
        'https://github.com/NTCoding/ecommerce-demo-app/blob/main/src/file.ts#L42',
      )
    })

    it('allows user to override pre-configured settings', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          vscodePath: null,
          githubOrg: 'https://github.com/NTCoding',
          githubBranch: 'main',
        }),
      )

      const { result } = renderHook(() => useCodeLinkSettings())

      act(() => {
        result.current.setGithubOrg('https://github.com/custom')
      })

      expect(result.current.settings.githubOrg).toBe('https://github.com/custom')
    })
  })
})
