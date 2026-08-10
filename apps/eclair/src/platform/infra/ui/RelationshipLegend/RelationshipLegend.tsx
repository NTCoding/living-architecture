export function RelationshipLegend(): React.ReactElement {
  return (
    <div
      aria-label="Relationship legend"
      className="floating-panel pointer-events-none absolute bottom-4 left-4 z-20 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]"
    >
      <span><strong>Label</strong>: semantic relationship</span>
      <span>━━━━ sync</span>
      <span>┄┄┄┄ async</span>
      <span><strong>when</strong>: condition</span>
    </div>
  )
}
