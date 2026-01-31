import {
  useState, useCallback 
} from 'react'
import { z } from 'zod'

const STORAGE_KEY = 'eclair-code-link-settings'

const codeLinkSettingsSchema = z.object({
  vscodePath: z.string().nullable(),
  githubOrg: z.string().nullable(),
  githubBranch: z.string(),
})

type CodeLinkSettings = z.infer<typeof codeLinkSettingsSchema>

interface UseCodeLinkSettingsReturn {
  settings: CodeLinkSettings
  setVscodePath: (path: string) => void
  setGithubOrg: (org: string) => void
  setGithubBranch: (branch: string) => void
  buildVscodeUrl: (filePath: string, lineNumber: number) => string | null
  buildGithubUrl: (repository: string, filePath: string, lineNumber: number) => string | null
}

const DEFAULT_SETTINGS: CodeLinkSettings = {
  vscodePath: null,
  githubOrg: null,
  githubBranch: 'main',
}

function loadSettings(): CodeLinkSettings {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === null) {
    return DEFAULT_SETTINGS
  }
  return codeLinkSettingsSchema.parse(JSON.parse(stored))
}

function saveSettings(settings: CodeLinkSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function useCodeLinkSettings(): UseCodeLinkSettingsReturn {
  const [settings, setSettings] = useState<CodeLinkSettings>(loadSettings)

  const setVscodePath = useCallback((path: string) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        vscodePath: path,
      }
      saveSettings(next)
      return next
    })
  }, [])

  const setGithubOrg = useCallback((org: string) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        githubOrg: org,
      }
      saveSettings(next)
      return next
    })
  }, [])

  const setGithubBranch = useCallback((branch: string) => {
    setSettings((prev) => {
      const next = {
        ...prev,
        githubBranch: branch,
      }
      saveSettings(next)
      return next
    })
  }, [])

  const buildVscodeUrl = useCallback(
    (filePath: string, lineNumber: number): string | null => {
      if (settings.vscodePath === null) {
        return null
      }
      return `vscode://file/${settings.vscodePath}/${filePath}:${lineNumber}`
    },
    [settings.vscodePath],
  )

  const buildGithubUrl = useCallback(
    (repository: string, filePath: string, lineNumber: number): string | null => {
      if (settings.githubOrg === null) {
        return null
      }
      const baseUrl = settings.githubOrg.replace(/\/$/, '')
      return `${baseUrl}/${repository}/blob/${settings.githubBranch}/${filePath}#L${lineNumber}`
    },
    [settings.githubOrg, settings.githubBranch],
  )

  return {
    settings,
    setVscodePath,
    setGithubOrg,
    setGithubBranch,
    buildVscodeUrl,
    buildGithubUrl,
  }
}
