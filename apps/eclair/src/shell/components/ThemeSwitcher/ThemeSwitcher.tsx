import { useTheme } from '@/platform/infra/theme/ThemeContext'
import {
  THEMES, THEME_LABELS 
} from '@/types/theme'

export function ThemeSwitcher(): React.ReactElement {
  const {
    theme, setTheme 
  } = useTheme()

  return (
    <div className="flex gap-1.5" role="tablist" aria-label="Theme selection">
      {THEMES.map((themeOption) => (
        <button
          key={themeOption}
          role="tab"
          aria-selected={theme === themeOption}
          onClick={() => setTheme(themeOption)}
          className={`
            flex-1 px-2 py-1.5 rounded-[calc(var(--radius)/2)] text-xs font-semibold
            border transition-all duration-200
            ${
        theme === themeOption
          ? 'bg-[var(--bg-secondary)] text-[var(--primary)] border-[var(--primary)]'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)] hover:border-[var(--primary)]'
        }
          `}
        >
          {THEME_LABELS[themeOption]}
        </button>
      ))}
    </div>
  )
}
