interface DomainBadgeProps {
  readonly domain: string
}

function hashString(str: string): number {
  const hash = Array.from(str).reduce((acc, char) => {
    const newHash = (acc << 5) - acc + char.charCodeAt(0)
    return newHash & newHash
  }, 0)
  return Math.abs(hash)
}

function getDomainColorClass(domain: string): string {
  const index = hashString(domain) % 8
  if (index === 0) return 'domain-badge-purple'
  if (index === 1) return 'domain-badge-green'
  if (index === 2) return 'domain-badge-amber'
  if (index === 3) return 'domain-badge-pink'
  if (index === 4) return 'domain-badge-blue'
  if (index === 5) return 'domain-badge-teal'
  if (index === 6) return 'domain-badge-orange'
  return 'domain-badge-indigo'
}

export function DomainBadge({ domain }: Readonly<DomainBadgeProps>): React.ReactElement {
  const colorClass = getDomainColorClass(domain)

  return (
    <span data-testid="domain-badge" className={`domain-badge ${colorClass}`}>
      {domain}
    </span>
  )
}
