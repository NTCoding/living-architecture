import {
  useMemo, useCallback, useEffect, useRef 
} from 'react';
import {
  useSearchParams, useNavigate 
} from 'react-router-dom';
import {
  ReactFlow, Background, Controls, useNodesState, useEdgesState 
} from '@xyflow/react';
import type {
  Node, Edge, NodeMouseHandler, EdgeMouseHandler 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { RiviereGraph } from '@/types/riviere';
import { useExport } from '@/contexts/ExportContext';
import {
  generateExportFilename,
  exportElementAsPng,
  exportSvgAsFile,
  UNNAMED_GRAPH_EXPORT_NAME,
} from '@/lib/exportGraph';
import {
  extractDomainMap, getConnectedDomains 
} from './extractDomainMap';
import { calculateTooltipPositionWithViewportClipping } from './calculateTooltipPosition';
import { pluralizeConnection } from './pluralize';
import type {
  DomainNodeData, DomainEdgeData 
} from './extractDomainMap';
import { DomainNode } from './components/DomainNode/DomainNode';
import { useDomainMapInteractions } from './hooks/useDomainMapInteractions';

interface DomainMapPageProps {readonly graph: RiviereGraph;}

const nodeTypes = { domain: DomainNode };

export function DomainMapPage({ graph }: DomainMapPageProps): React.ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    registerExportHandlers, clearExportHandlers 
  } = useExport();
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const highlightDomain = searchParams.get('highlight');

  const {
    domainNodes: initialNodes, domainEdges: initialEdges 
  } = useMemo(
    () => extractDomainMap(graph),
    [graph],
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DomainNodeData>>(initialNodes);
  const [edges, setEdges] = useEdgesState<Edge<DomainEdgeData>>(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const connectionText = pluralizeConnection(initialEdges.length);

  const nodeCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const node of nodes) {
      map.set(node.id, node.data.nodeCount);
    }
    return map;
  }, [nodes]);

  const {
    tooltip,
    inspector,
    focusedDomain,
    showNodeTooltip,
    showExternalNodeTooltip,
    showEdgeTooltip,
    hideTooltip,
    selectEdge,
    closeInspector,
    clearFocus,
  } = useDomainMapInteractions({ initialFocusedDomain: highlightDomain });

  const onNodeMouseEnter: NodeMouseHandler<Node<DomainNodeData>> = useCallback(
    (event, node) => {
      if (node.data.isExternal === true) {
        showExternalNodeTooltip(event.clientX, event.clientY, node.data.label, node.data.nodeCount);
      } else {
        showNodeTooltip(event.clientX, event.clientY, node.data.label, node.data.nodeCount);
      }
    },
    [showNodeTooltip, showExternalNodeTooltip],
  );

  const onNodeMouseLeave = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  const onEdgeMouseEnter: EdgeMouseHandler<Edge<DomainEdgeData>> = useCallback(
    (event, edge) => {
      if (edge.data === undefined) return;
      showEdgeTooltip(
        event.clientX,
        event.clientY,
        edge.source,
        edge.target,
        edge.data.apiCount,
        edge.data.eventCount,
      );
    },
    [showEdgeTooltip],
  );

  const onEdgeMouseLeave = useCallback(() => {
    hideTooltip();
  }, [hideTooltip]);

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge<DomainEdgeData>) => {
      if (edge.data === undefined) return;
      const sourceNodeCount = nodeCountMap.get(edge.source);
      const targetNodeCount = nodeCountMap.get(edge.target);
      if (sourceNodeCount === undefined || targetNodeCount === undefined) {
        throw new Error(
          `Edge references missing node: source=${edge.source} target=${edge.target}`,
        );
      }
      selectEdge(
        edge.source,
        edge.target,
        edge.data.apiCount,
        edge.data.eventCount,
        sourceNodeCount,
        targetNodeCount,
        edge.data.connections,
      );
    },
    [selectEdge, nodeCountMap],
  );

  const onNodeClick: NodeMouseHandler<Node<DomainNodeData>> = useCallback(
    (_event, node) => {
      if (node.data.isExternal === true) {
        return;
      }
      navigate(`/domains/${node.id}`);
    },
    [navigate],
  );

  const connectedDomains = useMemo(() => {
    if (focusedDomain === null) return null;
    return getConnectedDomains(focusedDomain, edges);
  }, [focusedDomain, edges]);

  const styledNodes = useMemo(() => {
    if (focusedDomain === null) return nodes;
    return nodes.map((node) => {
      const isFocused = node.id === focusedDomain;
      const isConnected = connectedDomains === null ? false : connectedDomains.has(node.id);
      const isDimmed = !isFocused && !isConnected;
      return {
        ...node,
        data: {
          ...node.data,
          dimmed: isDimmed,
        },
      };
    });
  }, [nodes, focusedDomain, connectedDomains]);

  const styledEdges = useMemo(() => {
    if (focusedDomain === null) return edges;
    return edges.map((edge) => {
      const isRelevant = edge.source === focusedDomain || edge.target === focusedDomain;
      return {
        ...edge,
        style: {
          ...edge.style,
          opacity: isRelevant ? 1 : 0.2,
        },
      };
    });
  }, [edges, focusedDomain]);

  const totalConnections = inspector.apiCount + inspector.eventCount;

  useEffect(() => {
    const graphName = graph.metadata.name ?? UNNAMED_GRAPH_EXPORT_NAME;

    const handleExportPng = (): void => {
      if (exportContainerRef.current) {
        const filename = generateExportFilename(graphName, 'png');
        const backgroundColor = getComputedStyle(document.documentElement)
          .getPropertyValue('--bg-primary')
          .trim();
        exportElementAsPng(exportContainerRef.current, filename, { backgroundColor }).catch(
          console.error,
        );
      }
    };

    const handleExportSvg = (): void => {
      const svg = exportContainerRef.current?.querySelector('svg');
      if (!(svg instanceof SVGSVGElement)) {
        throw new Error('Export container must contain an SVG element');
      }
      const filename = generateExportFilename(graphName, 'svg');
      exportSvgAsFile(svg, filename);
    };

    registerExportHandlers({
      onPng: handleExportPng,
      onSvg: handleExportSvg,
    });

    return () => {
      clearExportHandlers();
    };
  }, [graph.metadata.name, registerExportHandlers, clearExportHandlers]);

  return (
    <div ref={exportContainerRef} data-testid="domain-map-page" className="relative h-full w-full">
      <div data-testid="domain-map-flow" className="h-full w-full">
        <ReactFlow
          nodes={styledNodes}
          edges={styledEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onNodeClick={onNodeClick}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          onEdgeClick={onEdgeClick}
          onPaneClick={clearFocus}
          fitView
        >
          <Background />
          <Controls />
          <svg>
            <defs>
              <marker
                id="arrow-cyan"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#06B6D4" />
              </marker>
              <marker
                id="arrow-amber"
                viewBox="0 0 10 10"
                refX="10"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#F59E0B" />
              </marker>
            </defs>
          </svg>
        </ReactFlow>
      </div>

      <div className="floating-panel absolute left-2 top-4 md:left-4">
        <h1 className="mb-1 text-sm font-semibold text-[var(--text-primary)]">Domain Map</h1>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--text-secondary)] md:gap-4">
          <span>{initialNodes.length} domains</span>
          <span>{connectionText}</span>
        </div>
      </div>

      {tooltip.visible &&
        (() => {
          const {
            left, top 
          } = calculateTooltipPositionWithViewportClipping(tooltip.x, tooltip.y);
          return (
            <div
              data-testid="domain-map-tooltip"
              className="pointer-events-none fixed z-50 rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 shadow-lg"
              style={{
                left,
                top,
              }}
            >
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {tooltip.title}
              </div>
              <div className="text-xs text-[var(--text-secondary)]">{tooltip.detail}</div>
            </div>
          );
        })()}

      <div
        data-testid="domain-map-inspector"
        className={`inspector-panel ${inspector.visible ? 'inspector-panel-expanded' : 'inspector-panel-collapsed'}`}
      >
        <div className="inspector-header">
          <div className="inspector-title">
            <i className="ph ph-plugs-connected" aria-hidden="true" />
            <span>Integration Details</span>
          </div>
          <button onClick={closeInspector} className="inspector-close" aria-label="Close inspector">
            <i className="ph ph-x" aria-hidden="true" />
          </button>
        </div>

        <div className="inspector-body">
          <div className="inspector-section">
            <div className="inspector-section-title">Integration</div>
            <div className="inspector-integration-flow">
              <span className="inspector-integration-flow-domain">{inspector.source}</span>
              {' → '}
              <span className="inspector-integration-flow-domain">{inspector.target}</span>
            </div>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">Total Connections</div>
            <div className="inspector-stat-value">{totalConnections}</div>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">Connections</div>
            <div className="inspector-connection-list">
              {inspector.connections.map((conn, index) => {
                const isEvent = conn.targetNodeType === 'EventHandler';
                return (
                  <div
                    key={`${conn.sourceName}-${conn.targetName}-${index}`}
                    className="inspector-connection-item"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={isEvent ? 'badge-integration-event' : 'badge-integration-api'}
                      >
                        {isEvent ? 'EVENT' : 'API'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-[var(--text-primary)]">{conn.sourceName}</div>
                    <div className="text-xs text-[var(--text-secondary)]">→ {conn.targetName}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">Source Domain</div>
            <div className="inspector-domain-info">{inspector.source}</div>
            <div className="inspector-domain-meta">{inspector.sourceNodeCount} components</div>
          </div>

          <div className="inspector-section">
            <div className="inspector-section-title">Target Domain</div>
            <div className="inspector-domain-info">{inspector.target}</div>
            <div className="inspector-domain-meta">{inspector.targetNodeCount} components</div>
          </div>
        </div>
      </div>
    </div>
  );
}
