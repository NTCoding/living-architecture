import type { TooltipData } from '../../types'
import { CodeLinkMenu } from '@/features/flows/components/CodeLinkMenu'

interface GraphTooltipProps {
  data: TooltipData | null
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

function hasSourceLocation(node: TooltipData['node']): boolean {
  const loc = node.originalNode.sourceLocation
  return loc !== undefined && loc.lineNumber !== undefined
}

export function GraphTooltip({ data, onMouseEnter, onMouseLeave }: GraphTooltipProps): React.ReactElement | null {
  if (!data) return null

  const { node, x, y, incomingCount, outgoingCount } = data

  return (
    <div
      className="graph-tooltip fixed z-50 max-w-[300px] rounded-lg border bg-[var(--bg-secondary)] p-4 shadow-lg"
      style={{
        left: `${x + 10}px`,
        top: `${y - 10}px`,
      }}
      role="tooltip"
      data-testid="graph-tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="mb-2 text-sm font-bold text-[var(--text-primary)]">
        {node.name}
      </div>
      <div className="mb-1 text-xs text-[var(--text-secondary)]">
        <span className="font-semibold">Type:</span> {node.type}
      </div>
      <div className="mb-2 text-xs text-[var(--text-secondary)]">
        <span className="font-semibold">Domain:</span> {node.domain}
      </div>
      <div className="border-t border-[var(--border-color)] pt-2">
        <div className="text-xs text-[var(--text-secondary)]">
          <span className="font-semibold">Incoming:</span> {incomingCount} edge
          {incomingCount !== 1 ? 's' : ''}
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          <span className="font-semibold">Outgoing:</span> {outgoingCount} edge
          {outgoingCount !== 1 ? 's' : ''}
        </div>
      </div>
      {hasSourceLocation(node) && node.originalNode.sourceLocation !== undefined && node.originalNode.sourceLocation.lineNumber !== undefined && (
        <div className="mt-2 border-t border-[var(--border-color)] pt-2">
          <CodeLinkMenu
            filePath={node.originalNode.sourceLocation.filePath}
            lineNumber={node.originalNode.sourceLocation.lineNumber}
            repository={node.originalNode.sourceLocation.repository}
          />
        </div>
      )}
      <div className="mt-2 border-t border-[var(--border-color)] pt-2 text-xs italic text-[var(--text-tertiary)]">
        Click to trace flow
      </div>
    </div>
  )
}
