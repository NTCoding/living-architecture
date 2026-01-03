import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'
import type { DomainNodeData } from '../../extractDomainMap'

type DomainNodeProps = NodeProps<Node<DomainNodeData>>

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label
  return label.substring(0, maxLength - 1) + '…'
}

export function DomainNode(props: DomainNodeProps): React.ReactElement {
  const { data } = props
  const size = 100
  const opacity = data.dimmed === true ? 0.3 : 1
  const fontSize = data.label.length > 12 ? 10 : 12
  const displayLabel = truncateLabel(data.label, 16)
  const isExternal = data.isExternal === true

  const baseClasses = 'flex items-center justify-center rounded-full border-2 text-center shadow-lg transition-all hover:shadow-xl'
  const internalClasses = 'border-[var(--primary)] bg-[var(--bg-secondary)]'
  const externalClasses = 'domain-node-external'
  const nodeClasses = `${baseClasses} ${isExternal ? externalClasses : internalClasses}`

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
        className={nodeClasses}
        style={{ width: size, height: size, opacity }}
        title={data.label}
      >
        {isExternal ? (
          <div className="flex flex-col items-center gap-1">
            <i className="ph ph-arrow-square-out domain-node-external-icon" aria-hidden="true" />
            <span
              className="max-w-full overflow-hidden px-1 font-bold text-[var(--text-primary)]"
              style={{ fontSize: fontSize - 1, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
            >
              {displayLabel}
            </span>
          </div>
        ) : (
          <span
            className="max-w-full overflow-hidden px-2 font-bold text-[var(--text-primary)]"
            style={{ fontSize, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
          >
            {displayLabel}
          </span>
        )}
      </div>
    </>
  )
}
