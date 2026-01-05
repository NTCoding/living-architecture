import {
  useState, useEffect, useCallback, useRef 
} from 'react'
import type { AggregatedConnection } from '../../extractDomainDetails'
import { EdgeLine } from './EdgeLine'
import { DomainNode } from './DomainNode'
import { DomainInfoModal } from './DomainInfoModal'

interface ViewTransform {
  scale: number
  translateX: number
  translateY: number
}

interface DomainContextGraphProps {
  readonly domainId: string
  readonly connections: readonly AggregatedConnection[]
}

export interface DomainPosition {
  id: string
  x: number
  y: number
  isCurrent: boolean
}

function calculatePositions(
  currentDomainId: string,
  connections: AggregatedConnection[],
): DomainPosition[] {
  const positions: DomainPosition[] = []
  const centerX = 200
  const centerY = 150
  const radius = 140

  positions.push({
    id: currentDomainId,
    x: centerX,
    y: centerY,
    isCurrent: true,
  })

  const connectedDomains = [...new Set(connections.map((c) => c.targetDomain))]
  const angleStep = (2 * Math.PI) / Math.max(connectedDomains.length, 1)

  connectedDomains.forEach((domain, index) => {
    const angle = angleStep * index - Math.PI / 2
    positions.push({
      id: domain,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      isCurrent: false,
    })
  })

  return positions
}

function calculateViewBox(positions: DomainPosition[]): string {
  const padding = 20
  const maxNodeRadius = 40

  const xs = positions.map((p) => p.x)
  const ys = positions.map((p) => p.y)

  const minX = Math.min(...xs) - maxNodeRadius - padding
  const maxX = Math.max(...xs) + maxNodeRadius + padding
  const minY = Math.min(...ys) - maxNodeRadius - padding
  const maxY = Math.max(...ys) + maxNodeRadius + padding

  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
}

const MIN_SCALE = 0.5
const MAX_SCALE = 3
const ZOOM_SENSITIVITY = 0.001

export function DomainContextGraph({
  domainId,
  connections,
}: Readonly<DomainContextGraphProps>): React.ReactElement {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [transform, setTransform] = useState<ViewTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({
    x: 0,
    y: 0,
  })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const positions = calculatePositions(domainId, connections)
  const positionMap = new Map(positions.map((p) => [p.id, p]))
  const currentPosition = positionMap.get(domainId)
  const viewBox = calculateViewBox(positions)

  if (currentPosition === undefined) {
    throw new Error(`Expected position for current domain ${domainId}`)
  }

  const handleNodeClick = (nodeId: string): void => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
  }

  const handleCloseModal = useCallback((): void => {
    setSelectedNodeId(null)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>): void => {
    e.preventDefault()
    const delta = -e.deltaY * ZOOM_SENSITIVITY
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale + delta * prev.scale)),
    }))
  }, [])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): void => {
      if (e.button === 0) {
        setIsPanning(true)
        setPanStart({
          x: e.clientX - transform.translateX,
          y: e.clientY - transform.translateY,
        })
      }
    },
    [transform.translateX, transform.translateY],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>): void => {
      if (isPanning) {
        setTransform((prev) => ({
          ...prev,
          translateX: e.clientX - panStart.x,
          translateY: e.clientY - panStart.y,
        }))
      }
    },
    [isPanning, panStart],
  )

  const handleMouseUp = useCallback((): void => {
    setIsPanning(false)
  }, [])

  const handleResetView = useCallback((): void => {
    setTransform({
      scale: 1,
      translateX: 0,
      translateY: 0,
    })
  }, [])

  const ignoreFullscreenError = (): void => {
    return
  }

  const handleToggleFullscreen = useCallback((): void => {
    if (containerRef.current === null) return

    if (document.fullscreenElement === null) {
      containerRef.current.requestFullscreen().catch(ignoreFullscreenError)
    } else {
      document.exitFullscreen().catch(ignoreFullscreenError)
    }
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        handleCloseModal()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [handleCloseModal])

  useEffect(() => {
    const handleGlobalMouseUp = (): void => setIsPanning(false)
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [])

  useEffect(() => {
    const handleFullscreenChange = (): void => {
      setIsFullscreen(document.fullscreenElement !== null)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const selectedPosition = selectedNodeId === null ? undefined : positionMap.get(selectedNodeId)
  const selectedConnections =
    selectedNodeId === null ? [] : connections.filter((c) => c.targetDomain === selectedNodeId)

  const transformStyle = `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[var(--bg-primary)]"
    >
      <div
        className="h-full w-full"
        style={{
          transform: transformStyle,
          transformOrigin: 'center center',
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
      >
        <svg
          ref={svgRef}
          viewBox={viewBox}
          className="h-full w-full"
          aria-label={`Domain context graph for ${domainId}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <marker
              id="arrow-marker"
              markerWidth="6"
              markerHeight="6"
              viewBox="0 0 10 10"
              refX="10"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" style={{ fill: 'var(--text-tertiary)' }} />
            </marker>
          </defs>

          {connections.map((conn) => {
            const targetPosition = positionMap.get(conn.targetDomain)
            if (targetPosition === undefined) return null

            const isOutgoing = conn.direction === 'outgoing'
            const fromPos = isOutgoing ? currentPosition : targetPosition
            const toPos = isOutgoing ? targetPosition : currentPosition

            return (
              <EdgeLine
                key={`${domainId}-${conn.targetDomain}-${conn.direction}`}
                from={fromPos}
                to={toPos}
                fromRadius={fromPos.isCurrent ? 40 : 30}
                toRadius={toPos.isCurrent ? 40 : 30}
                testId={`edge-${domainId}-${conn.targetDomain}`}
                direction={conn.direction}
              />
            )
          })}

          {positions.map((pos) => (
            <DomainNode
              key={pos.id}
              position={pos}
              isSelected={pos.id === selectedNodeId}
              onClick={() => handleNodeClick(pos.id)}
            />
          ))}
        </svg>
      </div>

      <div className="absolute bottom-4 right-4 flex gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1 shadow-lg">
        <button
          type="button"
          onClick={() =>
            setTransform((prev) => ({
              ...prev,
              scale: Math.min(MAX_SCALE, prev.scale * 1.2),
            }))
          }
          className="flex h-8 w-8 items-center justify-center rounded text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="Zoom in"
        >
          <i className="ph ph-plus text-lg" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() =>
            setTransform((prev) => ({
              ...prev,
              scale: Math.max(MIN_SCALE, prev.scale / 1.2),
            }))
          }
          className="flex h-8 w-8 items-center justify-center rounded text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="Zoom out"
        >
          <i className="ph ph-minus text-lg" aria-hidden="true" />
        </button>
        <div className="mx-1 w-px bg-[var(--border-color)]" />
        <button
          type="button"
          onClick={handleResetView}
          className="flex h-8 w-8 items-center justify-center rounded text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label="Reset view"
        >
          <i className="ph ph-crosshair text-lg" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={handleToggleFullscreen}
          className="flex h-8 w-8 items-center justify-center rounded text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          <i
            className={`ph ${isFullscreen ? 'ph-arrows-in' : 'ph-arrows-out'} text-lg`}
            aria-hidden="true"
          />
        </button>
      </div>

      {selectedPosition !== undefined && selectedNodeId !== null && (
        <DomainInfoModal
          nodeId={selectedNodeId}
          connections={selectedConnections}
          isCurrent={selectedPosition.isCurrent}
          currentDomainId={domainId}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
