import { useMemo } from 'react';
import { RiviereQuery } from '@living-architecture/riviere-query';
import type { RiviereGraph } from '@living-architecture/riviere-schema';

export function useRiviereQuery(graph: RiviereGraph | null): RiviereQuery | null {
  return useMemo(() => {
    if (graph === null) {
      return null;
    }
    return new RiviereQuery(graph);
  }, [graph]);
}
