import {
  describe, it, expect 
} from 'vitest';
import {
  renderHook, act 
} from '@testing-library/react';
import { useDomainMapInteractions } from './useDomainMapInteractions';
import type { ConnectionDetail } from '../extractDomainMap';

describe('useDomainMapInteractions', () => {
  describe('tooltip', () => {
    it('shows tooltip with node data on node hover', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.showNodeTooltip(100, 200, 'orders', 5);
      });

      expect(result.current.tooltip.visible).toBe(true);
      expect(result.current.tooltip.title).toBe('orders');
      expect(result.current.tooltip.detail).toBe('5 components');
    });

    it('uses singular component for count of 1', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.showNodeTooltip(100, 200, 'orders', 1);
      });

      expect(result.current.tooltip.detail).toBe('1 component');
    });

    it('shows tooltip with edge data on edge hover', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.showEdgeTooltip(100, 200, 'orders', 'payments', 3, 2);
      });

      expect(result.current.tooltip.visible).toBe(true);
      expect(result.current.tooltip.title).toBe('orders → payments');
      expect(result.current.tooltip.detail).toBe('5 connections · Click for details');
    });

    it('uses singular connection for count of 1', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.showEdgeTooltip(100, 200, 'orders', 'payments', 1, 0);
      });

      expect(result.current.tooltip.detail).toBe('1 connection · Click for details');
    });

    it('hides tooltip on hideTooltip', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.showNodeTooltip(100, 200, 'orders', 5);
      });
      expect(result.current.tooltip.visible).toBe(true);

      act(() => {
        result.current.hideTooltip();
      });
      expect(result.current.tooltip.visible).toBe(false);
    });

    it('positions tooltip at mouse coordinates with offset', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.showNodeTooltip(100, 200, 'orders', 5);
      });

      expect(result.current.tooltip.x).toBe(114);
      expect(result.current.tooltip.y).toBe(186);
    });

    it('shows tooltip with external system data', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.showExternalNodeTooltip(100, 200, 'Stripe', 3);
      });

      expect(result.current.tooltip.visible).toBe(true);
      expect(result.current.tooltip.title).toBe('Stripe');
      expect(result.current.tooltip.detail).toBe('External System · 3 connections');
    });

    it('uses singular connection for external system with count of 1', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.showExternalNodeTooltip(100, 200, 'Stripe', 1);
      });

      expect(result.current.tooltip.detail).toBe('External System · 1 connection');
    });
  });

  describe('inspector', () => {
    it('opens inspector with edge data on selectEdge', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.selectEdge('orders', 'payments', 3, 2, 10, 5, []);
      });

      expect(result.current.inspector.visible).toBe(true);
      expect(result.current.inspector.source).toBe('orders');
      expect(result.current.inspector.target).toBe('payments');
      expect(result.current.inspector.apiCount).toBe(3);
      expect(result.current.inspector.eventCount).toBe(2);
      expect(result.current.inspector.sourceNodeCount).toBe(10);
      expect(result.current.inspector.targetNodeCount).toBe(5);
    });

    it('hides tooltip when opening inspector', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.showEdgeTooltip(100, 200, 'orders', 'payments', 3, 2);
      });
      expect(result.current.tooltip.visible).toBe(true);

      act(() => {
        result.current.selectEdge('orders', 'payments', 3, 2, 10, 5, []);
      });
      expect(result.current.tooltip.visible).toBe(false);
    });

    it('closes inspector on closeInspector', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.selectEdge('orders', 'payments', 3, 2, 10, 5, []);
      });
      expect(result.current.inspector.visible).toBe(true);

      act(() => {
        result.current.closeInspector();
      });
      expect(result.current.inspector.visible).toBe(false);
    });

    it('stores connection details in inspector', () => {
      const { result } = renderHook(() => useDomainMapInteractions());
      const connections: ConnectionDetail[] = [
        {
          sourceName: 'PlaceOrder',
          targetName: 'ProcessPayment',
          type: 'sync',
          targetNodeType: 'API',
        },
        {
          sourceName: 'OrderCreated',
          targetName: 'HandleOrder',
          type: 'async',
          targetNodeType: 'EventHandler',
        },
      ];

      act(() => {
        result.current.selectEdge('orders', 'payments', 1, 1, 10, 5, connections);
      });

      expect(result.current.inspector.connections).toEqual(connections);
    });
  });

  describe('focus', () => {
    it('initializes with null focused domain by default', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      expect(result.current.focusedDomain).toBeNull();
    });

    it('initializes with provided initial focused domain', () => {
      const { result } = renderHook(() =>
        useDomainMapInteractions({ initialFocusedDomain: 'orders' }),
      );

      expect(result.current.focusedDomain).toBe('orders');
    });

    it('sets focused domain on selectDomain', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.selectDomain('orders');
      });

      expect(result.current.focusedDomain).toBe('orders');
    });

    it('clears focused domain on clearFocus', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.selectDomain('orders');
      });
      expect(result.current.focusedDomain).toBe('orders');

      act(() => {
        result.current.clearFocus();
      });
      expect(result.current.focusedDomain).toBeNull();
    });

    it('toggles focus off when clicking same domain', () => {
      const { result } = renderHook(() => useDomainMapInteractions());

      act(() => {
        result.current.selectDomain('orders');
      });
      expect(result.current.focusedDomain).toBe('orders');

      act(() => {
        result.current.selectDomain('orders');
      });
      expect(result.current.focusedDomain).toBeNull();
    });
  });
});
