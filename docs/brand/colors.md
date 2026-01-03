# Colors

Color palettes for each theme.

## Stream (Light)

Modern, flowing, professional with futuristic tech vibe.

### Primary

| Name | Hex | Usage |
|------|-----|-------|
| Teal | `#0D9488` | Primary accent, buttons, links |
| Cyan | `#06B6D4` | Gradient endpoint, highlights |
| Coral | `#FF6B6B` | Errors, events |
| Amber | `#F59E0B` | Warnings, domain operations |

### Gradient

```css
--flow-gradient: linear-gradient(90deg, #0D9488 0%, #06B6D4 100%);
--flow-gradient-subtle: linear-gradient(90deg, rgba(13, 148, 136, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
```

### Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| Cool Gray | `#F8FAFC` | Page background |
| Cool Gray 50 | `#F1F5F9` | Card backgrounds, inputs |
| Cool Gray 100 | `#E2E8F0` | Borders |
| Cool Gray 200 | `#CBD5E1` | Disabled states |
| Slate 700 | `#334155` | Body text |
| Slate 800 | `#1E293B` | Headings |
| Slate 900 | `#0F172A` | High emphasis text |

### Shadows

```css
--shadow-sm: 0 4px 12px rgba(13, 148, 136, 0.3);
--shadow-lg: 0 8px 24px rgba(13, 148, 136, 0.15);
```

---

## Voltage (Dark)

Cyberpunk, neon, electric, high-energy.

### Primary

| Name | Hex | Usage |
|------|-----|-------|
| Electric Blue | `#00D4FF` | Primary accent |
| Electric Blue Dark | `#0066FF` | Gradient endpoint |
| Hot Pink | `#FF006E` | Secondary accent |
| Lime Green | `#39FF14` | Success, positive |

### Glows

```css
--glow-blue: 0 0 8px rgba(0, 212, 255, 0.3), 0 0 16px rgba(0, 212, 255, 0.2);
--glow-pink: 0 0 8px rgba(255, 0, 110, 0.3), 0 0 16px rgba(255, 0, 110, 0.2);
--glow-lime: 0 0 8px rgba(57, 255, 20, 0.3), 0 0 16px rgba(57, 255, 20, 0.2);
```

### Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| Deep Dark | `#0A0A0F` | Page background |
| Dark Surface | `#1A1A24` | Card backgrounds |
| Dark Elevated | `#252535` | Elevated surfaces |
| Text White | `#FFFFFF` | Primary text |
| Text Gray | `#A0A0B0` | Secondary text |
| Text Dim | `#606070` | Disabled, tertiary |

---

## Circuit (Minimal)

Technical, minimal, GitHub-inspired, developer-first.

### Primary

| Name | Hex | Usage |
|------|-----|-------|
| Blue | `#0969DA` | Primary accent, links |
| Blue Light | `#DDF4FF` | Focus rings, highlights |
| Green | `#1A7F37` | Success states |
| Green Light | `#DCFFE4` | Success backgrounds |

### Neutrals

| Name | Hex | Usage |
|------|-----|-------|
| Gray 50 | `#F6F8FA` | Page background |
| Gray 100 | `#EAEEF2` | Secondary backgrounds |
| Gray 200 | `#D0D7DE` | Borders |
| Gray 300 | `#AFBAC7` | Disabled borders |
| Gray 400 | `#8C959F` | Placeholder text |
| Gray 500 | `#6E7781` | Secondary text |
| Gray 600 | `#57606A` | Body text |
| Gray 700 | `#424A53` | Emphasis |
| Gray 800 | `#32383F` | Strong emphasis |
| Gray 900 | `#24292F` | Headings |
| Black | `#000000` | Maximum contrast |
| White | `#FFFFFF` | Surfaces |

### Shadows

```css
--shadow-small: 0 1px 0 rgba(27, 31, 36, 0.04);
--shadow-medium: 0 3px 6px rgba(140, 149, 159, 0.15);
```

---

## Architectural Component Colors

Each type of architectural component has a distinct color per theme. These colors apply across all UIs that visualize architecture (graphs, diagrams, badges, etc.).

| Component Type | Stream | Voltage | Circuit |
|----------------|--------|---------|---------|
| UI | `#F43F5E` | `#FB7185` | `#E11D48` |
| API | `#0D9488` | `#00D4FF` | `#0969DA` |
| UseCase | `#A78BFA` | `#C4B5FD` | `#A78BFA` |
| DomainOp | `#06B6D4` | `#22D3EE` | `#0550AE` |
| Event | `#F59E0B` | `#F97316` | `#BF8700` |
| EventHandler | `#EAB308` | `#FACC15` | `#9A6700` |
| Custom | `#78716C` | `#A8A29E` | `#57534E` |
| External | `#94A3B8` | `#94A3B8` | `#9CA3AF` |

**Implementation:** Define these colors once in a centralized constants file and reference throughout the application. Never hardcode these values in components.
