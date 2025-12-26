# Icons

Phosphor Icons system for consistent iconography.

## Icon Library

**Library:** [Phosphor Icons](https://phosphoricons.com/)
**License:** MIT

**Why Phosphor:**
- 6000+ icons with consistent design
- Multiple weights (thin, light, regular, bold, fill, duotone)
- Adapts to all three theme styles
- Modern, developer-friendly aesthetic

## Installation

**CDN:**
```html
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.0.3/src/regular/style.css">
<link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.0.3/src/bold/style.css">
```

**NPM:**
```bash
npm install @phosphor-icons/web
```

## Sizing by Theme

| Theme | Weight | Size | Additional |
|-------|--------|------|------------|
| Stream | Regular | 20px | None |
| Voltage | Bold | 20px | `filter: drop-shadow(0 0 4px currentColor)` |
| Circuit | Regular | 16px | None |

## Semantic Icon Mapping

### Node Types

| Type | Icon | Class |
|------|------|-------|
| UI | browser | `ph-browser` |
| API | plug | `ph-plug` |
| UseCase | flow-arrow | `ph-flow-arrow` |
| DomainOp | gear | `ph-gear` |
| Event | lightning | `ph-lightning` |
| EventHandler | funnel | `ph-funnel` |
| Custom | cube | `ph-cube` |

### Domain Types

| Domain | Icon | Class |
|--------|------|-------|
| Orders | shopping-cart | `ph-shopping-cart` |
| Inventory | package | `ph-package` |
| Shipping | truck | `ph-truck` |
| Payments | credit-card | `ph-credit-card` |
| Notifications | bell | `ph-bell` |
| Analytics | chart-line | `ph-chart-line` |
| Auth | lock | `ph-lock` |
| BFF | shuffle | `ph-shuffle` |

### Navigation & Actions

| Action | Icon | Class |
|--------|------|-------|
| Graph view | graph | `ph-graph` |
| List view | list | `ph-list` |
| Zoom in | magnifying-glass-plus | `ph-magnifying-glass-plus` |
| Zoom out | magnifying-glass-minus | `ph-magnifying-glass-minus` |
| Reset view | arrows-in | `ph-arrows-in` |
| Expand | arrows-out | `ph-arrows-out` |
| Settings | gear-six | `ph-gear-six` |
| Upload | upload | `ph-upload` |
| Download | download | `ph-download` |
| Theme (light) | sun | `ph-sun` |
| Theme (dark) | moon | `ph-moon` |
| Filter | funnel | `ph-funnel` |
| Search | magnifying-glass | `ph-magnifying-glass` |
| Close | x | `ph-x` |
| Menu | list | `ph-list` |
| Info | info | `ph-info` |
| Warning | warning | `ph-warning` |
| Error | x-circle | `ph-x-circle` |
| Success | check-circle | `ph-check-circle` |

### Code & Architecture

| Concept | Icon | Class |
|---------|------|-------|
| Source code | code | `ph-code` |
| File | file-code | `ph-file-code` |
| Folder | folder | `ph-folder` |
| Git branch | git-branch | `ph-git-branch` |
| Network | tree-structure | `ph-tree-structure` |
| Layers | stack | `ph-stack` |
| Database | database | `ph-database` |
| Cloud | cloud | `ph-cloud` |
| Terminal | terminal | `ph-terminal` |

## Icon Button Pattern

```css
.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.icon-button:hover {
  background: var(--surface-hover);
  color: var(--primary);
}

.icon-button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

## Theme-Specific Styling

```css
/* Stream */
.theme-stream .icon {
  font-size: 20px;
  color: var(--text);
}
.theme-stream .icon-accent {
  color: #0D9488;
}

/* Voltage */
.theme-voltage .icon {
  font-size: 20px;
  color: var(--text);
  filter: drop-shadow(0 0 4px currentColor);
}
.theme-voltage .icon-accent {
  color: #00D4FF;
}

/* Circuit */
.theme-circuit .icon {
  font-size: 16px;
  color: var(--text);
}
.theme-circuit .icon-accent {
  color: #0969DA;
}
```
