import { Handle, Position } from '@xyflow/react'
import type { NodeProps, Node } from '@xyflow/react'

interface DomainNodeData extends Record<string, unknown> {
  label: string
  nodeCount: number
  dimmed?: boolean
}

type DomainNodeProps = NodeProps<Node<DomainNodeData>>

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label
  return label.substring(0, maxLength - 1) + '…'
}

export function DomainNode(props: DomainNodeProps): React.ReactElement {
  const { data } = props
  const size = 80
  const opacity = data.dimmed === true ? 0.3 : 1
  const fontSize = data.label.length > 10 ? 11 : 13
  const displayLabel = truncateLabel(data.label, 12)

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
        className="flex items-center justify-center rounded-full border-2 border-[var(--primary)] bg-[var(--bg-secondary)] text-center shadow-lg transition-all hover:shadow-xl"
        style={{ width: size, height: size, opacity }}
        title={data.label}
      >
        <span
          className="max-w-full overflow-hidden px-2 font-semibold text-[var(--text-primary)]"
          style={{ fontSize }}
        >
          {displayLabel}
        </span>
      </div>
    </>
  )
}
