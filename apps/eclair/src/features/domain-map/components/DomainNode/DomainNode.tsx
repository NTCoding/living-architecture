import {
  Handle, Position 
} from '@xyflow/react'
import type {
  NodeProps, Node 
} from '@xyflow/react'
import type { DomainNodeData } from '../../extractDomainMap'

type DomainNodeProps = NodeProps<Node<DomainNodeData>>

// All domain nodes use consistent sizing for visual clarity.
// Larger circles with proportional text ensure readable labels.
const DOMAIN_NODE_SIZE = 120
const EXTERNAL_NODE_SIZE = 100
const DIMMED_OPACITY = 0.3
const FULL_OPACITY = 1
const DOMAIN_FONT_SIZE = 14
const EXTERNAL_FONT_SIZE = 12

export function DomainNode(props: DomainNodeProps): React.ReactElement {
  const { data } = props
  const isExternal = data.isExternal ?? false
  const size = isExternal ? EXTERNAL_NODE_SIZE : DOMAIN_NODE_SIZE
  const opacity = data.dimmed ? DIMMED_OPACITY : FULL_OPACITY
  const fontSize = isExternal ? EXTERNAL_FONT_SIZE : DOMAIN_FONT_SIZE

  // Show full label - circles are sized to accommodate typical domain names
  const displayLabel = data.label

  const baseClasses =
    'flex items-center justify-center rounded-full border-2 text-center shadow-lg transition-all hover:shadow-xl'
  const internalClasses = 'border-[var(--primary)] bg-[var(--bg-secondary)]'
  const externalClasses = 'domain-node-external'
  const domainNodeClasses = `${baseClasses} ${isExternal ? externalClasses : internalClasses}`

  return (
    <>
      <Handle id="top-target" type="target" position={Position.Top} className="invisible" />
      <Handle id="bottom-target" type="target" position={Position.Bottom} className="invisible" />
      <Handle id="left-target" type="target" position={Position.Left} className="invisible" />
      <Handle id="right-target" type="target" position={Position.Right} className="invisible" />
      <Handle id="top-source" type="source" position={Position.Top} className="invisible" />
      <Handle id="bottom-source" type="source" position={Position.Bottom} className="invisible" />
      <Handle id="left-source" type="source" position={Position.Left} className="invisible" />
      <Handle id="right-source" type="source" position={Position.Right} className="invisible" />
      <div
        className={domainNodeClasses}
        style={{
          width: size,
          height: size,
          opacity,
        }}
        title={data.label}
      >
        {isExternal ? (
          <div className="flex flex-col items-center gap-1">
            <i className="ph ph-arrow-square-out domain-node-external-icon" aria-hidden="true" />
            <span
              className="max-w-full overflow-hidden px-2 font-bold text-[var(--text-primary)] leading-tight"
              style={{ fontSize }}
            >
              {displayLabel}
            </span>
          </div>
        ) : (
          <span
            className="max-w-full overflow-hidden px-3 font-bold text-[var(--text-primary)] leading-tight"
            style={{ fontSize }}
          >
            {displayLabel}
          </span>
        )}
      </div>
    </>
  )
}
