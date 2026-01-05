import dagre from 'dagre';
import type { SimulationNode } from '../../types';
import { NODE_RADII } from '../../types';

interface DagreLayoutInput {
  nodes: SimulationNode[];
  edges: Array<{
    source: string;
    target: string;
  }>;
}

export function computeDagreLayout(input: DagreLayoutInput): Map<
  string,
  {
    x: number;
    y: number;
  }
> {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: 'LR',
    nodesep: 50,
    ranksep: 120,
    marginx: 40,
    marginy: 40,
  });

  for (const node of input.nodes) {
    const radius = NODE_RADII[node.type];
    const size = radius * 2 + 40;
    g.setNode(node.id, {
      width: size,
      height: size,
    });
  }

  for (const edge of input.edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  const positions = new Map<
    string,
    {
      x: number;
      y: number;
    }
  >();
  for (const node of input.nodes) {
    const layoutNode = g.node(node.id);
    positions.set(node.id, {
      x: layoutNode.x,
      y: layoutNode.y,
    });
  }

  return positions;
}
