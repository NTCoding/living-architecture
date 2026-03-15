import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import type { ArchitectureEvolutionNodeData } from '../../data/architecture-evolution-scenario'

type ArchitectureEvolutionNodeProps = NodeProps<Node<ArchitectureEvolutionNodeData>>

const HANDLE_CLASS_NAME = 'invisible'

const HANDLE_POSITIONS = {
  start: '28%',
  middle: '50%',
  end: '72%',
} as const

function ArchitectureEvolutionHandles(): React.ReactElement {
  return (
    <>
      <Handle
        id="top-left-target"
        type="target"
        position={Position.Top}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.start }}
      />
      <Handle
        id="top-target"
        type="target"
        position={Position.Top}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="top-middle-target"
        type="target"
        position={Position.Top}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="top-right-target"
        type="target"
        position={Position.Top}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.end }}
      />
      <Handle
        id="bottom-left-target"
        type="target"
        position={Position.Bottom}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.start }}
      />
      <Handle
        id="bottom-target"
        type="target"
        position={Position.Bottom}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="bottom-middle-target"
        type="target"
        position={Position.Bottom}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="bottom-right-target"
        type="target"
        position={Position.Bottom}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.end }}
      />
      <Handle
        id="left-top-target"
        type="target"
        position={Position.Left}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.start }}
      />
      <Handle
        id="left-target"
        type="target"
        position={Position.Left}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="left-middle-target"
        type="target"
        position={Position.Left}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="left-bottom-target"
        type="target"
        position={Position.Left}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.end }}
      />
      <Handle
        id="right-top-target"
        type="target"
        position={Position.Right}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.start }}
      />
      <Handle
        id="right-target"
        type="target"
        position={Position.Right}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="right-middle-target"
        type="target"
        position={Position.Right}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="right-bottom-target"
        type="target"
        position={Position.Right}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.end }}
      />
      <Handle
        id="top-left-source"
        type="source"
        position={Position.Top}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.start }}
      />
      <Handle
        id="top-source"
        type="source"
        position={Position.Top}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="top-middle-source"
        type="source"
        position={Position.Top}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="top-right-source"
        type="source"
        position={Position.Top}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.end }}
      />
      <Handle
        id="bottom-left-source"
        type="source"
        position={Position.Bottom}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.start }}
      />
      <Handle
        id="bottom-source"
        type="source"
        position={Position.Bottom}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="bottom-middle-source"
        type="source"
        position={Position.Bottom}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="bottom-right-source"
        type="source"
        position={Position.Bottom}
        className={HANDLE_CLASS_NAME}
        style={{ left: HANDLE_POSITIONS.end }}
      />
      <Handle
        id="left-top-source"
        type="source"
        position={Position.Left}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.start }}
      />
      <Handle
        id="left-source"
        type="source"
        position={Position.Left}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="left-middle-source"
        type="source"
        position={Position.Left}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="left-bottom-source"
        type="source"
        position={Position.Left}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.end }}
      />
      <Handle
        id="right-top-source"
        type="source"
        position={Position.Right}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.start }}
      />
      <Handle
        id="right-source"
        type="source"
        position={Position.Right}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="right-middle-source"
        type="source"
        position={Position.Right}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.middle }}
      />
      <Handle
        id="right-bottom-source"
        type="source"
        position={Position.Right}
        className={HANDLE_CLASS_NAME}
        style={{ top: HANDLE_POSITIONS.end }}
      />
    </>
  )
}

export function ArchitectureEvolutionNode({
  data,
  id,
}: ArchitectureEvolutionNodeProps): React.ReactElement {
  return (
    <>
      <ArchitectureEvolutionHandles />
      <div
        data-testid={`arch-evo-node-${id}`}
        data-evolution-state={data.state}
        data-transition={data.transition}
        data-kind={data.kind}
        className="arch-evo-node graph-node"
        title={data.label}
      >
        <div className="arch-evo-node-header">
          <div className="arch-evo-node-icon">
            <i className={`ph ph-${data.icon}`} aria-hidden="true" />
          </div>
          <div className="arch-evo-node-title">{data.label}</div>
        </div>
      </div>
    </>
  )
}
