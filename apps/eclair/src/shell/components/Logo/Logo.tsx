import { useTheme } from '@/platform/infra/theme/ThemeContext'

interface LogoProps {readonly size?: number}

function StreamLogo({
  size,
  gradientId,
}: {
  readonly size: number
  readonly gradientId: string
}): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="40" y2="40">
          <stop offset="0%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill={`url(#${gradientId})`} />
      <circle cx="12" cy="12" r="2.5" fill="white" />
      <circle cx="28" cy="12" r="2.5" fill="white" />
      <circle cx="20" cy="20" r="3.5" fill="white" />
      <circle cx="12" cy="28" r="2.5" fill="white" opacity="0.8" />
      <circle cx="28" cy="28" r="2.5" fill="white" opacity="0.8" />
      <line x1="12" y1="12" x2="20" y2="20" stroke="white" strokeWidth="1.5" opacity="0.8" />
      <line x1="28" y1="12" x2="20" y2="20" stroke="white" strokeWidth="1.5" opacity="0.8" />
      <line x1="20" y1="20" x2="12" y2="28" stroke="white" strokeWidth="1.5" opacity="0.6" />
      <line x1="20" y1="20" x2="28" y2="28" stroke="white" strokeWidth="1.5" opacity="0.6" />
    </svg>
  )
}

function VoltageLogo({ size }: { readonly size: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="8" fill="#1A1A24" />
      <circle cx="12" cy="12" r="3" fill="#00D4FF" />
      <circle cx="28" cy="12" r="3" fill="#00D4FF" />
      <circle cx="20" cy="20" r="4" fill="#00D4FF" />
      <circle cx="12" cy="28" r="3" fill="#FF006E" />
      <circle cx="28" cy="28" r="3" fill="#39FF14" />
      <line x1="12" y1="12" x2="20" y2="20" stroke="#00D4FF" strokeWidth="2" />
      <line x1="28" y1="12" x2="20" y2="20" stroke="#00D4FF" strokeWidth="2" />
      <line x1="20" y1="20" x2="12" y2="28" stroke="#FF006E" strokeWidth="2" />
      <line x1="20" y1="20" x2="28" y2="28" stroke="#39FF14" strokeWidth="2" />
    </svg>
  )
}

function CircuitLogo({ size }: { readonly size: number }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect width="40" height="40" rx="6" fill="#000000" />
      <circle cx="12" cy="12" r="2.5" fill="white" />
      <circle cx="28" cy="12" r="2.5" fill="white" />
      <circle cx="20" cy="20" r="3.5" fill="white" />
      <circle cx="12" cy="28" r="2.5" fill="white" />
      <circle cx="28" cy="28" r="2.5" fill="white" />
      <line x1="12" y1="12" x2="20" y2="20" stroke="white" strokeWidth="1.5" />
      <line x1="28" y1="12" x2="20" y2="20" stroke="white" strokeWidth="1.5" />
      <line x1="20" y1="20" x2="12" y2="28" stroke="white" strokeWidth="1.5" />
      <line x1="20" y1="20" x2="28" y2="28" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

export function Logo({ size = 36 }: LogoProps): React.ReactElement {
  const { theme } = useTheme()
  const gradientId = `logo-gradient-${size}`

  switch (theme) {
    case 'voltage':
      return <VoltageLogo size={size} />
    case 'circuit':
      return <CircuitLogo size={size} />
    case 'stream':
    default:
      return <StreamLogo size={size} gradientId={gradientId} />
  }
}
