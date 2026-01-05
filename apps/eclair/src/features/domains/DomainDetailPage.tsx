import {
  useState, useRef, useCallback, forwardRef 
} from 'react';
import { useParams } from 'react-router-dom';
import type { RiviereGraph } from '@/types/riviere';
import {
  extractDomainDetails, type DomainDetails 
} from './extractDomainDetails';
import { parseDomainKey } from '@/lib/riviereTestFixtures';
import { DomainContextGraph } from './components/DomainContextGraph/DomainContextGraph';
import {
  DomainDetailView, type NodeTypeFilter 
} from './DomainDetailView';

type ViewMode = 'graph' | 'detail';

interface DomainDetailPageProps {readonly graph: RiviereGraph;}

export function DomainDetailPage({ graph }: DomainDetailPageProps): React.ReactElement {
  const { domainId } = useParams<{ domainId: string }>();

  if (domainId === undefined) {
    return <DomainNotFound />;
  }

  const parsedDomainId = parseDomainKey(domainId);
  const domain = extractDomainDetails(graph, parsedDomainId);

  if (domain === null) {
    return <DomainNotFound />;
  }

  return <DomainDetailContent domain={domain} />;
}

interface DomainDetailContentProps {readonly domain: DomainDetails;}

function DomainDetailContent({ domain }: DomainDetailContentProps): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('detail');
  const tabRefs = useRef<Map<ViewMode, HTMLButtonElement | null>>(new Map());

  const [nodeSearch, setNodeSearch] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<NodeTypeFilter>('all');
  const [entitySearch, setEntitySearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');

  const setTabRef = useCallback(
    (mode: ViewMode) => (el: HTMLButtonElement | null) => {
      tabRefs.current.set(mode, el);
    },
    [],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const modes: ViewMode[] = ['graph', 'detail'];
      const currentIndex = modes.indexOf(viewMode);

      const isArrowRight = event.key === 'ArrowRight';
      const isArrowLeft = event.key === 'ArrowLeft';

      const computeNewIndex = (): number | undefined => {
        if (isArrowRight) return (currentIndex + 1) % modes.length;
        if (isArrowLeft) return (currentIndex - 1 + modes.length) % modes.length;
        return undefined;
      };
      const newIndex = computeNewIndex();

      if (newIndex === undefined) return;

      const newMode = modes[newIndex];
      if (newMode !== undefined) {
        setViewMode(newMode);
        tabRefs.current.get(newMode)?.focus();
      }
    },
    [viewMode],
  );

  return (
    <div className="space-y-6">
      <DomainHeader
        domain={domain}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onKeyDown={handleKeyDown}
        setTabRef={setTabRef}
      />

      {viewMode === 'graph' ? (
        <div data-testid="graph-panel">
          <DomainContextGraph domainId={domain.id} connections={domain.aggregatedConnections} />
        </div>
      ) : (
        <DomainDetailView
          domain={domain}
          nodeSearch={nodeSearch}
          setNodeSearch={setNodeSearch}
          nodeTypeFilter={nodeTypeFilter}
          setNodeTypeFilter={setNodeTypeFilter}
          entitySearch={entitySearch}
          setEntitySearch={setEntitySearch}
          eventSearch={eventSearch}
          setEventSearch={setEventSearch}
        />
      )}
    </div>
  );
}

interface DomainHeaderProps {
  readonly domain: DomainDetails;
  readonly viewMode: ViewMode;
  readonly setViewMode: (mode: ViewMode) => void;
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  readonly setTabRef: (mode: ViewMode) => (el: HTMLButtonElement | null) => void;
}

function DomainHeader({
  domain,
  viewMode,
  setViewMode,
  onKeyDown,
  setTabRef,
}: DomainHeaderProps): React.ReactElement {
  return (
    <header data-testid="domain-header">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-[var(--font-heading)] text-2xl font-bold text-[var(--text-primary)]">
            {domain.id}
          </h1>
          <span className="rounded bg-[var(--primary-muted)] px-2 py-0.5 text-xs font-medium uppercase text-[var(--primary)]">
            {domain.systemType}
          </span>
        </div>
        <div
          role="tablist"
          aria-label="View mode"
          className="flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-0.5"
        >
          <ViewModeTab
            mode="graph"
            label="Graph"
            icon="ph-graph"
            isSelected={viewMode === 'graph'}
            onClick={() => setViewMode('graph')}
            onKeyDown={onKeyDown}
            ref={setTabRef('graph')}
          />
          <ViewModeTab
            mode="detail"
            label="Details"
            icon="ph-list"
            isSelected={viewMode === 'detail'}
            onClick={() => setViewMode('detail')}
            onKeyDown={onKeyDown}
            ref={setTabRef('detail')}
          />
        </div>
      </div>
      <p className="mt-1 text-[var(--text-secondary)]">{domain.description}</p>
    </header>
  );
}

interface ViewModeTabProps {
  readonly mode: ViewMode;
  readonly label: string;
  readonly icon: string;
  readonly isSelected: boolean;
  readonly onClick: () => void;
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}

const ViewModeTab = forwardRef<HTMLButtonElement, ViewModeTabProps>(function ViewModeTab(
  {
    label, icon, isSelected, onClick, onKeyDown 
  },
  ref,
) {
  return (
    <button
      ref={ref}
      role="tab"
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        isSelected
          ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      <i className={`ph ${icon}`} aria-hidden="true" />
      {label}
    </button>
  );
});

function DomainNotFound(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <i className="ph ph-warning-circle text-4xl text-[var(--text-tertiary)]" aria-hidden="true" />
      <p className="text-lg text-[var(--text-secondary)]">Domain not found</p>
    </div>
  );
}
