import { useState } from 'react';
import type { Node } from '@/types/riviere';

export interface OrphanDetectionResult {
  readonly hasOrphans: boolean;
  readonly orphanNodeIds: Set<string>;
  readonly orphanCount: number;
}

interface OrphanWarningProps {
  readonly result: OrphanDetectionResult;
  readonly nodes: Node[];
}

export function OrphanWarning({
  result, nodes 
}: OrphanWarningProps): React.ReactElement | null {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (!result.hasOrphans || isDismissed) {
    return null;
  }

  const nodeText = result.orphanCount === 1 ? 'node has' : 'nodes have';
  const orphanNodes = nodes.filter((n) => result.orphanNodeIds.has(n.id));

  return (
    <>
      <div
        className="px-8 py-3 bg-amber-50 border-b border-amber-200 dark:bg-amber-950 dark:border-amber-800 circuit:bg-amber-25"
        role="alert"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <i
              className="ph ph-warning text-amber-600 dark:text-amber-400 text-lg flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <button
              onClick={() => setIsOpen(true)}
              className="text-sm text-amber-900 dark:text-amber-100 circuit:text-amber-950 text-left hover:underline cursor-pointer"
            >
              <strong>Warning:</strong> {result.orphanCount} {nodeText} no connections. Click to
              view details.
            </button>
          </div>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex-shrink-0"
            aria-label="Close orphan warning"
          >
            <i className="ph ph-x text-lg" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 circuit:bg-gray-50 rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-96 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 circuit:border-gray-200">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white circuit:text-slate-900">
                Orphan Nodes ({result.orphanCount})
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                aria-label="Close modal"
              >
                <i className="ph ph-x text-lg" aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-6 space-y-2">
                {orphanNodes.map((node) => (
                  <div
                    key={node.id}
                    className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 circuit:bg-gray-100 rounded border border-slate-200 dark:border-slate-600 circuit:border-gray-300"
                  >
                    <i className="ph ph-dot text-amber-600 dark:text-amber-400 text-lg flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white circuit:text-slate-900">
                        {node.name}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 circuit:text-slate-700">
                        <span className="inline-block mr-3">ID: {node.id}</span>
                        <span className="inline-block mr-3">Type: {node.type}</span>
                        <span className="inline-block">Domain: {node.domain}</span>
                      </div>
                      {node.sourceLocation && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {node.sourceLocation.filePath}:{node.sourceLocation.lineNumber}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-6 border-t border-slate-200 dark:border-slate-700 circuit:border-gray-200">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 circuit:bg-gray-200 text-slate-900 dark:text-white circuit:text-slate-900 rounded hover:bg-slate-200 dark:hover:bg-slate-600 circuit:hover:bg-gray-300 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
