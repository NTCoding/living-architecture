import {
  describe, it, expect 
} from 'vitest';
import { getClosestHandle } from './handlePositioning';

describe('getClosestHandle', () => {
  const sourcePos = {
    x: 100,
    y: 100,
  };

  describe('returns handles based on angle between source and target', () => {
    it('returns right-source and left-target when target is to the right', () => {
      const targetPos = {
        x: 200,
        y: 100,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('right-source');
      expect(handles.targetHandle).toBe('left-target');
    });

    it('returns bottom-source and top-target when target is below', () => {
      const targetPos = {
        x: 100,
        y: 200,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('bottom-source');
      expect(handles.targetHandle).toBe('top-target');
    });

    it('returns top-source and bottom-target when target is above', () => {
      const targetPos = {
        x: 100,
        y: 0,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('top-source');
      expect(handles.targetHandle).toBe('bottom-target');
    });

    it('returns left-source and right-target when target is to the left', () => {
      const targetPos = {
        x: 0,
        y: 100,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('left-source');
      expect(handles.targetHandle).toBe('right-target');
    });
  });

  describe('handles diagonal angles correctly', () => {
    it('returns right-source and left-target for northeast angle', () => {
      const targetPos = {
        x: 150,
        y: 75,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('right-source');
      expect(handles.targetHandle).toBe('left-target');
    });

    it('returns right-source and left-target for southeast 45-degree angle', () => {
      const targetPos = {
        x: 150,
        y: 150,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('right-source');
      expect(handles.targetHandle).toBe('left-target');
    });

    it('returns left-source and right-target for northwest 45-degree angle', () => {
      const targetPos = {
        x: 50,
        y: 50,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('left-source');
      expect(handles.targetHandle).toBe('right-target');
    });

    it('returns bottom-source and top-target for southwest angle below 45 degrees', () => {
      const targetPos = {
        x: 75,
        y: 150,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('bottom-source');
      expect(handles.targetHandle).toBe('top-target');
    });
  });

  describe('handles angle boundaries correctly', () => {
    it('handles angle slightly above right boundary (more right than top)', () => {
      const targetPos = {
        x: 140,
        y: 80,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('right-source');
      expect(handles.targetHandle).toBe('left-target');
    });

    it('handles angle below right boundary at π/4 (45 degrees)', () => {
      const targetPos = {
        x: 150,
        y: 150,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('right-source');
      expect(handles.targetHandle).toBe('left-target');
    });

    it('handles angle above bottom boundary (more bottom than right)', () => {
      const targetPos = {
        x: 120,
        y: 200,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('bottom-source');
      expect(handles.targetHandle).toBe('top-target');
    });

    it('handles angle below left boundary (more bottom than left)', () => {
      const targetPos = {
        x: 80,
        y: 200,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('bottom-source');
      expect(handles.targetHandle).toBe('top-target');
    });
  });

  describe('works with various distance ratios', () => {
    it('handles close targets', () => {
      const targetPos = {
        x: 101,
        y: 100,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('right-source');
      expect(handles.targetHandle).toBe('left-target');
    });

    it('handles far targets', () => {
      const targetPos = {
        x: 500,
        y: 100,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('right-source');
      expect(handles.targetHandle).toBe('left-target');
    });

    it('handles targets at equal horizontal and vertical distance (45 degrees)', () => {
      const targetPos = {
        x: 150,
        y: 150,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('right-source');
      expect(handles.targetHandle).toBe('left-target');
    });
  });

  describe('handles negative coordinates', () => {
    it('works with negative source coordinates', () => {
      const negativeSourcePos = {
        x: -100,
        y: -100,
      };
      const targetPos = {
        x: 0,
        y: -100,
      };
      const handles = getClosestHandle(negativeSourcePos, targetPos);

      expect(handles.sourceHandle).toBe('right-source');
      expect(handles.targetHandle).toBe('left-target');
    });

    it('works with negative target coordinates', () => {
      const targetPos = {
        x: -100,
        y: -100,
      };
      const handles = getClosestHandle(sourcePos, targetPos);

      expect(handles.sourceHandle).toBe('left-source');
      expect(handles.targetHandle).toBe('right-target');
    });
  });
});
