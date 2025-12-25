import { Handle, Position } from '@xyflow/react'

interface DomainNodeProps {
  data: {
    label: string
    nodeCount: number
    dimmed?: boolean
  }
}

export function DomainNode({ data }: DomainNodeProps): React.ReactElement {
  const size = 80
  const opacity = data.dimmed === true ? 0.3 : 1
  const fontSize = data.label.length > 10 ? 11 : 13

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
      >
        <span
          className="px-2 font-semibold text-[var(--text-primary)]"
          style={{ fontSize }}
        >
          {data.label}
        </span>
      </div>
    </>
  )
}
