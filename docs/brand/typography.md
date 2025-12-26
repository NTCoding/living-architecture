# Typography

Font families and hierarchy for each theme.

## Font Families

### Stream

| Role | Family | Weight | Usage |
|------|--------|--------|-------|
| Headings | Rubik | 500-700 | H1, H2, H3, labels |
| Body | Lato | 400-700 | Paragraphs, descriptions |
| Code | Fira Code | 400-500 | Code blocks, paths |

### Voltage

| Role | Family | Weight | Usage |
|------|--------|--------|-------|
| Headings | Space Grotesk | 600-700 | H1, H2, H3, labels |
| Body | Inter | 400-600 | Paragraphs, descriptions |
| Code | Fira Code | 400-600 | Code blocks, paths |

### Circuit

| Role | Family | Weight | Usage |
|------|--------|--------|-------|
| Headings | JetBrains Mono | 700 | H1, H2, H3 (monospace) |
| Body | Inter | 400-700 | Paragraphs, descriptions |
| Code | JetBrains Mono | 400-600 | Code blocks, paths |

## Type Scale

### Hierarchy

| Element | Stream | Voltage | Circuit |
|---------|--------|---------|---------|
| H1 | Rubik 700 36px | Space Grotesk 700 32px | JetBrains Mono 700 32px |
| H2 | Rubik 700 24px | Space Grotesk 600 20px | JetBrains Mono 700 20px |
| H3/Section | Rubik 700 18px | Space Grotesk 600 16px | JetBrains Mono 700 16px |
| Body | Lato 400 14px | Inter 400 14px | Inter 400 14px |
| Small/Label | Rubik 600 12px | Space Grotesk 500 11px | JetBrains Mono 600 12px |
| Code | Fira Code 400 13px | Fira Code 400 12px | JetBrains Mono 400 13px |

### Line Height

| Theme | Line Height |
|-------|-------------|
| Stream | 1.6 |
| Voltage | 1.6 |
| Circuit | 1.5 |

## Wordmark

**Text:** "Éclair"
**Font:** Rubik, 18px, 600 weight
**Color:** `#0D9488` (teal)

**Tagline:** "Code visualization platform"
**Font:** Lato, 12px
**Color:** `#334155` (slate)

## Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Lato:wght@400;700&family=Rubik:wght@500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
```

## CSS Variables

```css
/* Stream */
.theme-stream {
  --font-heading: 'Rubik', sans-serif;
  --font-body: 'Lato', sans-serif;
  --font-mono: 'Fira Code', monospace;
  --line-height: 1.6;
}

/* Voltage */
.theme-voltage {
  --font-heading: 'Space Grotesk', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'Fira Code', monospace;
  --line-height: 1.6;
}

/* Circuit */
.theme-circuit {
  --font-heading: 'JetBrains Mono', monospace;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --line-height: 1.5;
}
```
