# Graph Visualization

Canvas, node, edge, and tooltip specifications for graph views.

## Design Principles

1. **Dotted pattern** (not grid lines) — Subtle, unobtrusive reference points
2. **Visual hierarchy** — Canvas recedes, nodes "pop" forward
3. **Depth separation** — Foreground elements distinct from background
4. **Theme consistency** — Same pattern structure, only colors change

## Visual Hierarchy Layers

| Layer | Z-Index | Purpose |
|-------|---------|---------|
| Background gradient | 0 | Base color, theme mood |
| Dot pattern | 1 | Spatial reference, aids panning |
| Edges/Links | 2 | Connection lines |
| Nodes | 3 | Primary interactive elements |
| Labels | 4 | Text on/near nodes |
| Tooltips/Overlays | 5 | Hover states, popups |

---

## Canvas Background

**Pattern:** Radial gradient dots (NOT linear gradient lines)
**Dot size:** 1.5px diameter
**Dot spacing:** 24px grid
**Dot opacity:** Subtle, visible but not distracting

### Stream

```css
.canvas {
  background: linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%);
  position: relative;
}
.canvas::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(13, 148, 136, 0.25) 1.5px, transparent 1.5px);
  background-size: 24px 24px;
  pointer-events: none;
}
```

### Voltage

```css
.canvas {
  background: linear-gradient(135deg, #0A0A0F 0%, #12121C 100%);
  position: relative;
}
.canvas::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(0, 212, 255, 0.15) 1.5px, transparent 1.5px);
  background-size: 24px 24px;
  pointer-events: none;
}
```

### Circuit

```css
.canvas {
  background: #F6F8FA;
  position: relative;
}
.canvas::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(36, 41, 47, 0.12) 1.5px, transparent 1.5px);
  background-size: 24px 24px;
  pointer-events: none;
}
```

---

## Node Styling

Nodes must stand out from canvas through:
- White/contrast stroke for separation
- Drop shadow for depth
- Saturated fill for contrast
- Hover amplification

### Node Dimensions

| Property | Stream | Voltage | Circuit |
|----------|--------|---------|---------|
| Radius | 14px | 12px | 10px |
| Stroke color | white | #00D4FF | white |
| Stroke width | 3px | 2px | 2px |
| Shadow blur | 10px | 12px (glow) | 6px |

### Stream Nodes

```css
.graph-node {
  stroke: white;
  stroke-width: 3px;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.25));
}
.graph-node:hover {
  stroke-width: 4px;
  filter: drop-shadow(0 6px 16px rgba(0, 0, 0, 0.35));
  transform: scale(1.05);
}
```

### Voltage Nodes

```css
.graph-node {
  stroke: #00D4FF;
  stroke-width: 2px;
  filter: drop-shadow(0 0 12px rgba(0, 212, 255, 0.4));
}
.graph-node:hover {
  stroke-width: 3px;
  filter: drop-shadow(0 0 20px rgba(0, 212, 255, 0.6));
  transform: scale(1.08);
}
```

### Circuit Nodes

```css
.graph-node {
  stroke: white;
  stroke-width: 2px;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15));
}
.graph-node:hover {
  stroke-width: 3px;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.2));
}
```

---

## Node Type Colors

| Type | Stream | Voltage | Circuit |
|------|--------|---------|---------|
| UI | `#94A3B8` | `#606070` | `#8C959F` |
| API | `#0D9488` | `#00D4FF` | `#0969DA` |
| UseCase | `#FF6B6B` | `#FF006E` | `#1A7F37` |
| DomainOp | `#F59E0B` | `#39FF14` | `#24292F` |
| Event | `#06B6D4` | `#A0A0B0` | `#6E7781` |
| EventHandler | `#FF6B6B` | `#FF006E` | `#1A7F37` |

---

## Edge Styling

Edges connect nodes but should not compete visually.

| Property | Stream | Voltage | Circuit |
|----------|--------|---------|---------|
| Color | `#0D9488` | `#00D4FF` | `#0969DA` |
| Width | 2.5px | 2px | 2px |
| Opacity | 0.6 | 0.6 | 0.5 |
| Event dash | 6,4 | 5,3 | 4,3 |
| Event color | `#FF6B6B` | `#39FF14` | `#1A7F37` |

### Stream Edges

```css
.graph-link {
  stroke: #0D9488;
  stroke-width: 2.5px;
  fill: none;
  opacity: 0.6;
}
.graph-link.event {
  stroke: #FF6B6B;
  stroke-dasharray: 6,4;
}
.graph-link:hover {
  opacity: 1;
  stroke-width: 3.5px;
}
```

### Voltage Edges

```css
.graph-link {
  stroke: #00D4FF;
  stroke-width: 2px;
  fill: none;
  opacity: 0.6;
}
.graph-link.event {
  stroke: #39FF14;
  stroke-dasharray: 5,3;
}
.graph-link:hover {
  opacity: 1;
  filter: drop-shadow(0 0 4px currentColor);
}
```

---

## Label Readability

Labels use outline stroke for readability against any background.

### Stream Labels

```css
.graph-node-label {
  font: 600 11px 'Rubik';
  fill: #1E293B;
  paint-order: stroke fill;
  stroke: white;
  stroke-width: 3px;
  stroke-linejoin: round;
}
```

### Voltage Labels

```css
.graph-node-label {
  font: 600 11px 'Space Grotesk';
  fill: white;
  paint-order: stroke fill;
  stroke: #0A0A0F;
  stroke-width: 3px;
  stroke-linejoin: round;
}
```

### Circuit Labels

```css
.graph-node-label {
  font: 600 11px 'JetBrains Mono';
  fill: #24292F;
  paint-order: stroke fill;
  stroke: white;
  stroke-width: 2px;
  stroke-linejoin: round;
}
```

---

## Canvas Container

```css
.canvas-container {
  position: relative;
  width: 100%;
  height: calc(100vh - 200px);
  min-height: 500px;
  border-radius: var(--border-radius-md);
  overflow: hidden;
}
```

---

## Implementation Checklist

- [ ] Use radial-gradient for dots (NOT linear-gradient lines)
- [ ] Dot pattern via ::before with pointer-events: none
- [ ] Nodes have white/contrast stroke for separation
- [ ] Nodes have drop-shadow for depth
- [ ] Labels use paint-order: stroke fill for outline
- [ ] Edges are lower opacity than nodes
- [ ] Hover states amplify elevation
- [ ] All themes use same pattern structure
