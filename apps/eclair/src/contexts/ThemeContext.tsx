import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { Theme } from '@/types/theme'
import { DEFAULT_THEME, THEME_STORAGE_KEY } from '@/types/theme'

interface ThemeContextValue {
  readonly theme: Theme
  readonly setTheme: (theme: Theme) => void
}

const themeContext = createContext<ThemeContextValue | null>(null)

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'stream' || stored === 'voltage' || stored === 'circuit') {
    return stored
  }
  return DEFAULT_THEME
}

function applyThemeToDocument(theme: Theme): void {
  document.body.classList.remove('theme-stream', 'theme-voltage', 'theme-circuit')
  document.body.classList.add(`theme-${theme}`)
}

interface ThemeProviderProps {
  readonly children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps): React.ReactElement {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    applyThemeToDocument(newTheme)
  }, [])

  useEffect(() => {
    applyThemeToDocument(theme)
  }, [theme])

  const contextValue = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <themeContext.Provider value={contextValue}>
      {children}
    </themeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(themeContext)
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
