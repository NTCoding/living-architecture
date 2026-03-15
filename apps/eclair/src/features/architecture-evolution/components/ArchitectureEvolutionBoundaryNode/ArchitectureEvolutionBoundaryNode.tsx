import type { Node, NodeProps } from '@xyflow/react'

export interface ArchitectureEvolutionBoundaryData extends Record<string, unknown> {
  readonly label: string
  readonly boundaryKind: 'slice'
}

type ArchitectureEvolutionBoundaryNodeProps = NodeProps<Node<ArchitectureEvolutionBoundaryData>>

export function ArchitectureEvolutionBoundaryNode({
  data,
}: ArchitectureEvolutionBoundaryNodeProps): React.ReactElement {
  const testId = `arch-evo-boundary-${String(data.label).toLowerCase().split(' ').join('-')}`

  return (
    <div className="arch-evo-boundary" data-boundary-kind={data.boundaryKind} data-testid={testId}>
      <div className="arch-evo-boundary-label">{data.label}</div>
    </div>
  )
}
