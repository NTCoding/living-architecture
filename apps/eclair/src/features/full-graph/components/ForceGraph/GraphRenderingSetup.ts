import * as d3 from 'd3';
import type {
  SimulationNode, SimulationLink 
} from '../../types';
import type {
  Edge, NodeType 
} from '@/types/riviere';
import type { Theme } from '@/types/theme';
import { traceFlow } from '../../hooks/useFlowTracing';
import {
  EDGE_COLORS, SEMANTIC_EDGE_COLORS 
} from '../../types';
import { getLinkNodeId } from './FocusModeStyling';

export {
  getLinkNodeId,
  applyFocusModeCircleStyles,
  applyResetModeCircleStyles,
  applyFocusModeLinkStyles,
  applyResetModeLinkStyles,
  applyFocusModeTextStyles,
  applyResetModeTextStyles,
} from './FocusModeStyling';

export interface UpdateHighlightParams {
  node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>;
  link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>;
  filteredEdges: Edge[];
  highlightedNodeIds: Set<string> | undefined;
}

export function extractCoordinates(nodes: SimulationNode[], field: 'x' | 'y'): number[] {
  return nodes.map((n) => {
    const value = field === 'x' ? n.x : n.y;
    if (value === undefined) {
      const coord = field === 'x' ? 'x' : 'y';
      throw new Error(`Node ${n.id} missing layout ${coord} coordinate`);
    }
    return value;
  });
}

export function updateHighlight({
  node,
  link,
  filteredEdges,
  highlightedNodeIds,
}: UpdateHighlightParams): void {
  if (!highlightedNodeIds || highlightedNodeIds.size === 0) {
    node.attr('opacity', 1);
    link.attr('opacity', 0.6);
    return;
  }

  const firstHighlightedNodeId = Array.from(highlightedNodeIds)[0];
  if (firstHighlightedNodeId === undefined) return;

  const highlightedFlow = traceFlow(firstHighlightedNodeId, filteredEdges);

  node.attr('opacity', (d) => (highlightedFlow.nodeIds.has(d.id) ? 1 : 0.2));

  link.attr('opacity', (d) => {
    const sourceId = getLinkNodeId(d.source);
    const targetId = getLinkNodeId(d.target);
    const edgeKey = `${sourceId}->${targetId}`;
    return highlightedFlow.edgeKeys.has(edgeKey) ? 0.8 : 0.1;
  });
}

function appendArrowMarker(
  defs: d3.Selection<SVGDefsElement, unknown, d3.BaseType, unknown>,
  id: string,
  fill: string,
): void {
  defs
    .append('marker')
    .attr('id', id)
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', fill);
}

export function setupSVGFiltersAndMarkers(
  defs: d3.Selection<SVGDefsElement, unknown, d3.BaseType, unknown>,
  theme: Theme,
): void {
  defs
    .append('filter')
    .attr('id', 'blur-background')
    .append('feGaussianBlur')
    .attr('stdDeviation', 3);

  defs
    .append('filter')
    .attr('id', 'focused-glow')
    .append('feGaussianBlur')
    .attr('stdDeviation', 4)
    .attr('result', 'coloredBlur');

  const glowFilter = defs.select('#focused-glow');
  glowFilter.append('feMerge').call((merge) => {
    merge.append('feMergeNode').attr('in', 'coloredBlur');
    merge.append('feMergeNode').attr('in', 'SourceGraphic');
  });

  appendArrowMarker(defs, 'arrowhead-sync', EDGE_COLORS[theme].sync);
  appendArrowMarker(defs, 'arrowhead-async', EDGE_COLORS[theme].async);

  appendArrowMarker(defs, 'arrowhead-event', SEMANTIC_EDGE_COLORS[theme].event);
  appendArrowMarker(defs, 'arrowhead-eventHandler', SEMANTIC_EDGE_COLORS[theme].eventHandler);
  appendArrowMarker(defs, 'arrowhead-external', SEMANTIC_EDGE_COLORS[theme].external);
  appendArrowMarker(defs, 'arrowhead-default', SEMANTIC_EDGE_COLORS[theme].default);
}

export interface FitViewportParams {
  nodes: SimulationNode[];
  dimensions: {
    width: number;
    height: number;
  };
  padding: number;
}

export function calculateFitViewportTransform(params: FitViewportParams): {
  translateX: number;
  translateY: number;
  scale: number;
} {
  if (params.nodes.length === 0) {
    return {
      translateX: 0,
      translateY: 0,
      scale: 1,
    };
  }

  const xs = extractCoordinates(params.nodes, 'x');
  const ys = extractCoordinates(params.nodes, 'y');

  const minX = Math.min(...xs) - params.padding;
  const maxX = Math.max(...xs) + params.padding;
  const minY = Math.min(...ys) - params.padding;
  const maxY = Math.max(...ys) + params.padding;

  const graphWidth = maxX - minX;
  const graphHeight = maxY - minY;
  const scale = Math.min(
    params.dimensions.width / graphWidth,
    params.dimensions.height / graphHeight,
    1,
  );
  const translateX = (params.dimensions.width - graphWidth * scale) / 2 - minX * scale;
  const translateY = (params.dimensions.height - graphHeight * scale) / 2 - minY * scale;

  return {
    translateX,
    translateY,
    scale,
  };
}

type SemanticEdgeType = 'event' | 'eventHandler' | 'external' | 'default';

export interface SetupLinksParams {
  linkGroup: d3.Selection<SVGGElement, unknown, d3.BaseType, unknown>;
  links: SimulationLink[];
  theme: Theme;
  nodeMap: Map<string, SimulationNode>;
  getSemanticEdgeType: (sourceType: NodeType, targetType: NodeType) => SemanticEdgeType;
  getSemanticEdgeColor: (sourceType: NodeType, targetType: NodeType, theme: Theme) => string;
  isAsyncEdge: (type: string | undefined) => boolean;
}

function getNodeType(nodeId: string, nodeMap: Map<string, SimulationNode>): NodeType {
  const node = nodeMap.get(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found in node map`);
  }
  return node.type;
}

export function setupLinks({
  linkGroup,
  links,
  theme,
  nodeMap,
  getSemanticEdgeType,
  getSemanticEdgeColor,
  isAsyncEdge: isAsync,
}: SetupLinksParams): d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown> {
  return linkGroup
    .selectAll<SVGPathElement, SimulationLink>('path')
    .data(links)
    .join('path')
    .attr('class', (d) => {
      const sourceId = getLinkNodeId(d.source);
      const targetId = getLinkNodeId(d.target);
      const sourceType = getNodeType(sourceId, nodeMap);
      const targetType = getNodeType(targetId, nodeMap);
      const semanticType = getSemanticEdgeType(sourceType, targetType);
      const classes = ['graph-link', `edge-${semanticType}`];
      if (isAsync(d.type)) classes.push('async');
      return classes.join(' ');
    })
    .attr('stroke', (d) => {
      const sourceId = getLinkNodeId(d.source);
      const targetId = getLinkNodeId(d.target);
      const sourceType = getNodeType(sourceId, nodeMap);
      const targetType = getNodeType(targetId, nodeMap);
      return getSemanticEdgeColor(sourceType, targetType, theme);
    })
    .attr('stroke-width', 2)
    .attr('fill', 'none')
    .attr('opacity', 0.6)
    .attr('stroke-dasharray', (d) => (isAsync(d.type) ? '5,3' : 'none'))
    .attr('marker-end', (d) => {
      const sourceId = getLinkNodeId(d.source);
      const targetId = getLinkNodeId(d.target);
      const sourceType = getNodeType(sourceId, nodeMap);
      const targetType = getNodeType(targetId, nodeMap);
      const semanticType = getSemanticEdgeType(sourceType, targetType);
      return `url(#arrowhead-${semanticType})`;
    });
}

export interface SetupNodesParams {
  nodeGroup: d3.Selection<SVGGElement, unknown, d3.BaseType, unknown>;
  nodes: SimulationNode[];
  theme: Theme;
  getNodeColor: (type: NodeType, theme: Theme) => string;
  getNodeRadius: (type: NodeType) => number;
  getDomainColor: (domain: string, uniqueDomains: string[]) => string;
  uniqueDomains: string[];
  truncateName: (name: string, maxLength: number) => string;
}

export function setupNodes({
  nodeGroup,
  nodes,
  theme,
  getNodeColor,
  getNodeRadius,
  getDomainColor,
  uniqueDomains,
  truncateName: truncate,
}: SetupNodesParams): d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown> {
  const node = nodeGroup
    .selectAll<SVGGElement, SimulationNode>('g')
    .data(nodes)
    .join('g')
    .attr('class', 'graph-node')
    .attr('cursor', 'pointer');

  node
    .append('circle')
    .attr('class', 'node-circle')
    .attr('r', (d) => getNodeRadius(d.type))
    .attr('fill', (d) => getNodeColor(d.type, theme))
    .attr('stroke', 'rgba(255, 255, 255, 0.3)')
    .attr('stroke-width', 2);

  node
    .append('text')
    .attr('class', 'node-label')
    .attr('text-anchor', 'middle')
    .attr('dy', (d) => getNodeRadius(d.type) + 14)
    .attr('font-size', '11px')
    .attr('font-weight', 600)
    .attr('fill', 'var(--text-primary)')
    .text((d) => truncate(d.name, 30));

  node
    .append('text')
    .attr('class', 'node-domain-label')
    .attr('text-anchor', 'middle')
    .attr('dy', (d) => getNodeRadius(d.type) + 26)
    .attr('font-size', '9px')
    .attr('font-weight', 500)
    .attr('fill', (d) => getDomainColor(d.domain, uniqueDomains))
    .text((d) => d.domain);

  return node;
}

export interface UpdatePositionsParams {
  link: d3.Selection<SVGPathElement, SimulationLink, SVGGElement, unknown>;
  node: d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>;
  nodePositionMap: Map<string, SimulationNode>;
  getNodeRadius: (type: NodeType) => number;
}

export function createUpdatePositionsFunction(params: UpdatePositionsParams): () => void {
  const {
    link, node, nodePositionMap, getNodeRadius 
  } = params;

  return function updatePositions(): void {
    link.attr('d', (d) => {
      const sourceId = getLinkNodeId(d.source);
      const targetId = getLinkNodeId(d.target);
      const sourceNode = nodePositionMap.get(sourceId);
      const targetNode = nodePositionMap.get(targetId);

      if (!sourceNode) {
        throw new Error(
          `Link source node '${sourceId}' not found in position map. Available nodes: [${[...nodePositionMap.keys()].join(', ')}]`,
        );
      }
      if (!targetNode) {
        throw new Error(
          `Link target node '${targetId}' not found in position map. Available nodes: [${[...nodePositionMap.keys()].join(', ')}]`,
        );
      }
      if (sourceNode.x === undefined || sourceNode.y === undefined) {
        throw new Error(
          `Source node '${sourceId}' missing coordinates. Node: ${JSON.stringify(sourceNode)}`,
        );
      }
      if (targetNode.x === undefined || targetNode.y === undefined) {
        throw new Error(
          `Target node '${targetId}' missing coordinates. Node: ${JSON.stringify(targetNode)}`,
        );
      }

      const sourceX = sourceNode.x;
      const sourceY = sourceNode.y;
      const targetX = targetNode.x;
      const targetY = targetNode.y;

      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist === 0) return `M${sourceX},${sourceY}L${targetX},${targetY}`;

      const sourceRadius = getNodeRadius(sourceNode.type) + 4;
      const targetRadius = getNodeRadius(targetNode.type) + 12;

      const startX = sourceX + (dx / dist) * sourceRadius;
      const startY = sourceY + (dy / dist) * sourceRadius;
      const endX = targetX - (dx / dist) * targetRadius;
      const endY = targetY - (dy / dist) * targetRadius;

      return `M${startX},${startY}L${endX},${endY}`;
    });

    node.attr('transform', (d) => {
      if (d.x === undefined || d.y === undefined) {
        throw new Error(`Node ${d.id} missing layout coordinates after layout computation`);
      }
      return `translate(${d.x},${d.y})`;
    });
  };
}

export interface FocusModeZoomParams {
  nodes: SimulationNode[];
  focusedDomain: string;
  dimensions: {
    width: number;
    height: number;
  };
}

export function calculateFocusModeZoom(params: FocusModeZoomParams): {
  translateX: number;
  translateY: number;
  scale: number;
} | null {
  const {
    nodes, focusedDomain, dimensions 
  } = params;
  const focusedNodes = nodes.filter((n) => n.domain === focusedDomain);

  if (focusedNodes.length === 0) return null;

  const xs = extractCoordinates(focusedNodes, 'x');
  const ys = extractCoordinates(focusedNodes, 'y');

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const width = maxX - minX + 200;
  const height = maxY - minY + 200;

  const scale = Math.min(dimensions.width / width, dimensions.height / height, 2.5);

  const translateX = dimensions.width / 2 - centerX * scale;
  const translateY = dimensions.height / 2 - centerY * scale;

  return {
    translateX,
    translateY,
    scale,
  };
}

export interface ApplyDagrePositionsParams {
  nodes: SimulationNode[];
  positions: Map<
    string,
    {
      x: number;
      y: number;
    }
  >;
}

export function applyDagrePositions(params: ApplyDagrePositionsParams): void {
  const {
    nodes, positions 
  } = params;

  for (const node of nodes) {
    const pos = positions.get(node.id);
    if (pos) {
      node.x = pos.x;
      node.y = pos.y;
    }
  }
}

export interface ZoomBehaviorOptions {onInteractionStart?: () => void;}

export function setupZoomBehavior(
  svg: d3.Selection<SVGSVGElement, unknown, d3.BaseType, unknown>,
  g: d3.Selection<SVGGElement, unknown, d3.BaseType, unknown>,
  options?: ZoomBehaviorOptions,
): ReturnType<typeof d3.zoom<SVGSVGElement, unknown>> {
  const zoom = d3
    .zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 4])
    .on('start', () => {
      options?.onInteractionStart?.();
    })
    .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
      g.attr('transform', event.transform.toString());
    });

  svg.call(zoom);
  return zoom;
}
