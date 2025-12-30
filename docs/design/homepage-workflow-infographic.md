# Homepage Workflow Infographic — Design Brief

## Purpose

Visual infographic for the homepage "How It Works" section. Shows the Rivière workflow from source code to visualization.

## Flow (4 steps, left to right)

```
Your Code → Extract (Rivière) → Schema (JSON) → Visualize (Éclair)
```

### Step 1: Your Code
- **Icon:** Code file or code brackets `{ }` or multiple file stack
- **Label:** "Your Code"
- **Style:** Neutral/gray — this is the input

### Step 2: Extract (Rivière)
- **Icon:** Rivière logo (see `/apps/docs/public/logo.svg`)
- **Label:** "Rivière" with subtext "Extract"
- **Style:** Primary teal (#0D9488) — this is our tool

### Step 3: Schema
- **Icon:** JSON document or structured data icon
- **Label:** "Rivière Schema"
- **Style:** Outlined/secondary — this is the intermediate output

### Step 4: Visualize (Éclair)
- **Icon:** Graph/visualization icon or Éclair-specific mark if one exists
- **Label:** "Éclair" with subtext "Visualize"
- **Style:** Cyan (#06B6D4) — this is our tool

## Arrows/Connectors

- Flowing arrows between steps (not rigid straight lines)
- Could use gradient from teal → cyan
- Should feel like a "flow" (matches "flow-based architecture" concept)

## Brand Colors

From `/docs/brand/colors.md` (Stream theme):

| Element | Color |
|---------|-------|
| Primary teal | `#0D9488` |
| Cyan | `#06B6D4` |
| Gradient | `linear-gradient(90deg, #0D9488 0%, #06B6D4 100%)` |
| Text dark | `#1E293B` |
| Text secondary | `#334155` |
| Background | `#F1F5F9` |
| Border | `#E2E8F0` |

## Typography

From `/docs/brand/typography.md`:
- Headings: Rubik (500-700 weight)
- Body: Lato
- Code: Fira Code

## Format

- **Dimensions:** ~800×120px or similar aspect ratio
- **Format:** SVG preferred (scalable), PNG acceptable
- **Responsive:** Should work at smaller widths (min ~400px)
- **Dark mode:** Consider if a dark variant is needed (check if homepage has dark mode toggle)

## Placement

File location: `/apps/docs/public/workflow-infographic.svg`

Current placeholder in: `/apps/docs/index.md` (replace the inline SVG in the "How It Works" section)

## Reference Files

- Logo: `/apps/docs/public/logo.svg`
- Brand colors: `/docs/brand/colors.md`
- Brand typography: `/docs/brand/typography.md`
- Current homepage: `/apps/docs/index.md`

## Style Notes

- Clean, modern, professional
- Not overly playful — this is developer tooling
- Should feel cohesive with the rest of the documentation site
- Match the visual language of the hero image (`/apps/docs/public/eclair-hero.png`)
