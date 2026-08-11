import { CodeLinkMenu } from '@/platform/infra/presentation/CodeLinkMenu/CodeLinkMenu'

export const TOOLTIP_WIDTH = 310
export const TOOLTIP_HEIGHT = 200

export interface GraphTooltipData {
  readonly domain: string
  readonly incomingCount: number
  readonly name: string
  readonly outgoingCount: number
  readonly sourceLocation?: {
    readonly filePath: string
    readonly lineNumber: number
    readonly repository: string
  }
  readonly type: string
  readonly typeDescription?: string
  readonly x: number
  readonly y: number
}

interface GraphTooltipProps {
  readonly data: GraphTooltipData | null
  readonly onMouseEnter?: () => void
  readonly onMouseLeave?: () => void
}

function calculateTooltipPosition(
  x: number,
  y: number,
): {
  left: number
  top: number
} {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const wouldOverflowRight = x + TOOLTIP_WIDTH > viewportWidth
  const wouldOverflowBottom = y + TOOLTIP_HEIGHT > viewportHeight

  const left = wouldOverflowRight ? x - TOOLTIP_WIDTH : x + 10
  const top = wouldOverflowBottom ? y - TOOLTIP_HEIGHT - 10 : y - 10

  return {
    left,
    top,
  }
}

export function GraphTooltip({
  data,
  onMouseEnter,
  onMouseLeave,
}: GraphTooltipProps): React.ReactElement | null {
  if (!data) return null

  const {
    domain, incomingCount, name, outgoingCount, sourceLocation, type, typeDescription, x, y
  } =
    data
  const {
    left, top 
  } = calculateTooltipPosition(x, y)

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
      <div className="mb-2 text-sm font-bold text-[var(--text-primary)]">{name}</div>
      <div className="mb-1 text-xs text-[var(--text-secondary)]">
        <span className="font-semibold">Type:</span> {type}
      </div>
      {typeDescription !== undefined && (
        <div className="mb-2 text-xs text-[var(--text-secondary)]">{typeDescription}</div>
      )}
      <div className="mb-2 text-xs text-[var(--text-secondary)]">
        <span className="font-semibold">Domain:</span> {domain}
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
      {sourceLocation !== undefined && (
        <div className="mt-2 border-t border-[var(--border-color)] pt-2">
          <CodeLinkMenu
            filePath={sourceLocation.filePath}
            lineNumber={sourceLocation.lineNumber}
            repository={sourceLocation.repository}
          />
        </div>
      )}
      <div className="mt-2 border-t border-[var(--border-color)] pt-2 text-xs italic text-[var(--text-tertiary)]">
        Click to trace flow
      </div>
    </div>
  )
}
