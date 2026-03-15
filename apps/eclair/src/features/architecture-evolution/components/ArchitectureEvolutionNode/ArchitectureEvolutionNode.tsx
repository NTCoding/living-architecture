import {
  Handle, Position 
} from '@xyflow/react'
import type {
  Node, NodeProps 
} from '@xyflow/react'
import type { ArchitectureEvolutionNodeData } from '../../data/architecture-evolution-scenario'

type ArchitectureEvolutionNodeProps = NodeProps<Node<ArchitectureEvolutionNodeData>>

export function ArchitectureEvolutionNode({
  data,
  id,
}: ArchitectureEvolutionNodeProps): React.ReactElement {
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
        data-testid={`arch-evo-node-${id}`}
        data-evolution-state={data.state}
        data-kind={data.kind}
        className="arch-evo-node graph-node"
        title={data.label}
      >
        <div className="arch-evo-node-header">
          <div className="arch-evo-node-icon">
            <i className={`ph ph-${data.icon}`} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="arch-evo-node-subtitle">{data.subtitle}</div>
            <div className="arch-evo-node-title">{data.label}</div>
          </div>
        </div>
        <div className="arch-evo-capability-list">
          {data.capabilities.map((capability) => (
            <span
              key={capability.id}
              data-testid={`arch-evo-capability-${capability.id}`}
              data-evolution-state={capability.state}
              className="arch-evo-capability"
            >
              {capability.label}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
