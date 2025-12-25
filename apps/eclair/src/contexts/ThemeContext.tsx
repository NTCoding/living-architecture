import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Theme } from '@/types/theme'
import { DEFAULT_THEME, THEME_STORAGE_KEY } from '@/types/theme'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

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
  children: React.ReactNode
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

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
