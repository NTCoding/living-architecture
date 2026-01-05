const TOOLTIP_WIDTH = 180;
const TOOLTIP_HEIGHT = 60;

interface TooltipPosition {
  left: number;
  top: number;
}

export function calculateTooltipPositionWithViewportClipping(
  x: number,
  y: number,
  viewportWidth: number = window.innerWidth,
  viewportHeight: number = window.innerHeight,
): TooltipPosition {
  const wouldOverflowRight = x + TOOLTIP_WIDTH > viewportWidth;
  const wouldOverflowBottom = y + TOOLTIP_HEIGHT > viewportHeight;

  const left = wouldOverflowRight ? x - TOOLTIP_WIDTH - 10 : x;
  const top = wouldOverflowBottom ? y - TOOLTIP_HEIGHT - 10 : y;

  return {
    left,
    top,
  };
}
