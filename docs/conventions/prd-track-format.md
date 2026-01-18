# PRD Track Format

Track definitions in PRDs must use YAML format for reliable parsing by the task discovery system.

## YAML Schema

Add track definitions to the Parallelization section of your PRD:

```yaml
tracks:
  - id: A
    name: Extraction
    deliverables:
      - M1
      - M2
      - D3.3
      - M5
  - id: B
    name: Conventions
    deliverables:
      - D3.1
      - D3.2
      - D4.1
  - id: C
    name: Research
    deliverables:
      - R1
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Single letter track identifier (A, B, C, D, etc.) |
| `name` | string | Yes | Human-readable track name |
| `deliverables` | string[] | Yes | List of deliverable references (M1, D3.1, R1, etc.) |

## Deliverable Reference Formats

The following formats are supported for deliverable references:

- `M1`, `M2` - Milestone references
- `D3.1`, `D3.2` - Deliverable section references
- `R1`, `R2` - Research task references

## Validation

The TypeScript implementation validates tracks using Zod schemas. Invalid YAML or missing required fields will throw errors during task discovery.

```typescript
const trackSchema = z.object({
  id: z.string(),
  name: z.string(),
  deliverables: z.array(z.string()),
})

const tracksSchema = z.object({
  tracks: z.array(trackSchema),
})
```

## Error Handling

If a PRD in `docs/project/PRD/active/` is missing YAML track definitions, the `list-tasks` command will throw an error with a message indicating which PRD needs track definitions added.

## Example PRD Section

```markdown
## 10. Parallelization

The following tracks can be worked in parallel:

\`\`\`yaml
tracks:
  - id: A
    name: Extraction
    deliverables: [M1, M2, D3.3, M5]
  - id: B
    name: Conventions
    deliverables: [D3.1, D3.2, D4.1]
  - id: C
    name: Research
    deliverables: [R1]
  - id: D
    name: Docs
    deliverables: [D5.1, D5.2]
\`\`\`

Track A focuses on extraction logic, Track B on conventions...
```
