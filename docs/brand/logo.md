# Logo

**Design:** Hierarchical tree (connected nodes)
**Concept:** Architecture visualization through connected node graph

## Logo Variants

### Stream (Primary)

Teal-to-cyan gradient background. Use for marketing, documentation, and default contexts.

```html
<svg width="44" height="44" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="40" rx="12" fill="url(#stream-gradient)"/>
  <circle cx="12" cy="12" r="2.5" fill="white"/>
  <circle cx="28" cy="12" r="2.5" fill="white"/>
  <circle cx="20" cy="20" r="3.5" fill="white"/>
  <circle cx="12" cy="28" r="2.5" fill="white" opacity="0.8"/>
  <circle cx="28" cy="28" r="2.5" fill="white" opacity="0.8"/>
  <line x1="12" y1="12" x2="20" y2="20" stroke="white" stroke-width="1.5" opacity="0.8"/>
  <line x1="28" y1="12" x2="20" y2="20" stroke="white" stroke-width="1.5" opacity="0.8"/>
  <line x1="20" y1="20" x2="12" y2="28" stroke="white" stroke-width="1.5" opacity="0.6"/>
  <line x1="20" y1="20" x2="28" y2="28" stroke="white" stroke-width="1.5" opacity="0.6"/>
  <defs>
    <linearGradient id="stream-gradient" x1="0" y1="0" x2="40" y2="40">
      <stop offset="0%" stop-color="#0D9488"/>
      <stop offset="100%" stop-color="#06B6D4"/>
    </linearGradient>
  </defs>
</svg>
```

### Voltage (Dark)

Electric blue, hot pink, lime green accents. Use for dark mode contexts.

```html
<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="40" rx="8" fill="#1A1A24"/>
  <circle cx="12" cy="12" r="3" fill="#00D4FF"/>
  <circle cx="28" cy="12" r="3" fill="#00D4FF"/>
  <circle cx="20" cy="20" r="4" fill="#00D4FF"/>
  <circle cx="12" cy="28" r="3" fill="#FF006E"/>
  <circle cx="28" cy="28" r="3" fill="#39FF14"/>
  <line x1="12" y1="12" x2="20" y2="20" stroke="#00D4FF" stroke-width="2"/>
  <line x1="28" y1="12" x2="20" y2="20" stroke="#00D4FF" stroke-width="2"/>
  <line x1="20" y1="20" x2="12" y2="28" stroke="#FF006E" stroke-width="2"/>
  <line x1="20" y1="20" x2="28" y2="28" stroke="#39FF14" stroke-width="2"/>
</svg>
```

### Circuit (Minimal)

Black background, white nodes. Use for minimal/technical contexts.

```html
<svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="40" height="40" rx="6" fill="#000000"/>
  <circle cx="12" cy="12" r="2.5" fill="white"/>
  <circle cx="28" cy="12" r="2.5" fill="white"/>
  <circle cx="20" cy="20" r="3.5" fill="white"/>
  <circle cx="12" cy="28" r="2.5" fill="white"/>
  <circle cx="28" cy="28" r="2.5" fill="white"/>
  <line x1="12" y1="12" x2="20" y2="20" stroke="white" stroke-width="1.5"/>
  <line x1="28" y1="12" x2="20" y2="20" stroke="white" stroke-width="1.5"/>
  <line x1="20" y1="20" x2="12" y2="28" stroke="white" stroke-width="1.5"/>
  <line x1="20" y1="20" x2="28" y2="28" stroke="white" stroke-width="1.5"/>
</svg>
```

## Sizing

| Theme | Size | Border Radius |
|-------|------|---------------|
| Stream | 44px | 12px |
| Voltage | 40px | 8px |
| Circuit | 32px | 6px |

## Brand Pairing

Logo with wordmark:

```html
<div style="display: flex; align-items: center; gap: 16px;">
  <!-- Logo SVG here -->
  <span style="font-family: 'Rubik', sans-serif; font-size: 18px; font-weight: 600;
    background: linear-gradient(90deg, #0D9488 0%, #06B6D4 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
    Éclair
  </span>
</div>
```

**Fallback:** Use solid `#0D9488` when CSS gradients aren't supported (plain text, email).

## Usage Rules

**Do:**
- Use appropriate theme variant for context
- Maintain aspect ratio when scaling
- Ensure sufficient contrast with background

**Don't:**
- Distort or stretch the logo
- Change logo colors outside theme variants
- Place on busy backgrounds without contrast
- Use logo smaller than 24px
