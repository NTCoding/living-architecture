import type { Theme } from '@/types/theme'

interface ThemeFocusColors {
  borderColor: string
  glowColor: string
  shadowColor: string
  overlayBackground: string
}

const STREAM_FOCUS_COLORS: ThemeFocusColors = {
  borderColor: '#06B6D4',
  glowColor: '#06B6D4',
  shadowColor: 'rgba(6, 182, 212, 0.5)',
  overlayBackground: 'rgba(248, 250, 252, 0.4)',
}

const VOLTAGE_FOCUS_COLORS: ThemeFocusColors = {
  borderColor: '#00D4FF',
  glowColor: '#00D4FF',
  shadowColor: 'rgba(0, 212, 255, 0.6)',
  overlayBackground: 'rgba(10, 10, 15, 0.6)',
}

const CIRCUIT_FOCUS_COLORS: ThemeFocusColors = {
  borderColor: '#0969DA',
  glowColor: '#0969DA',
  shadowColor: 'rgba(9, 105, 218, 0.6)',
  overlayBackground: 'rgba(246, 248, 250, 0.4)',
}

export function getThemeFocusColors(theme: Theme): ThemeFocusColors {
  const colorsByTheme: Record<Theme, ThemeFocusColors> = {
    stream: STREAM_FOCUS_COLORS,
    voltage: VOLTAGE_FOCUS_COLORS,
    circuit: CIRCUIT_FOCUS_COLORS,
  }
  return colorsByTheme[theme]
}
