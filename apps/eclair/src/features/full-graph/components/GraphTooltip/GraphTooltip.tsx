import type { TooltipData } from '../../types'
import { CodeLinkMenu } from '@/features/flows/components/CodeLinkMenu/CodeLinkMenu'

export const TOOLTIP_WIDTH = 310
export const TOOLTIP_HEIGHT = 200

interface GraphTooltipProps {
  readonly data: TooltipData | null
  readonly onMouseEnter?: () => void
  readonly onMouseLeave?: () => void
}

function hasSourceLocation(node: TooltipData['node']): node is TooltipData['node'] & { originalNode: { sourceLocation: { filePath: string; lineNumber: number; repository?: string } } } {
  return node.originalNode.sourceLocation != null && typeof node.originalNode.sourceLocation?.lineNumber === 'number'
}

function calculateTooltipPosition(x: number, y: number): { left: number; top: number } {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const wouldOverflowRight = x + TOOLTIP_WIDTH > viewportWidth
  const wouldOverflowBottom = y + TOOLTIP_HEIGHT > viewportHeight

  const left = wouldOverflowRight ? x - TOOLTIP_WIDTH : x + 10
  const top = wouldOverflowBottom ? y - TOOLTIP_HEIGHT - 10 : y - 10

  return { left, top }
}

export function GraphTooltip({ data, onMouseEnter, onMouseLeave }: GraphTooltipProps): React.ReactElement | null {
  if (!data) return null

  const { node, x, y, incomingCount, outgoingCount } = data
  const { left, top } = calculateTooltipPosition(x, y)

  return (
    <div
      className="graph-tooltip fixed z-50 max-w-[300px] rounded-lg border bg-[var(--bg-secondary)] p-4 shadow-lg"
      style={{
        left: `${left}px`,
        top: `${top}px`,
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
          {incomingCount === 1 ? '' : 's'}
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          <span className="font-semibold">Outgoing:</span> {outgoingCount} edge
          {outgoingCount === 1 ? '' : 's'}
        </div>
      </div>
      {hasSourceLocation(node) && (
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
