# Getting Started

Load a Rivière graph into Éclair to start exploring your architecture.

## Load from File

1. Click the **Upload** button in the header
2. Select a `.json` file containing a Rivière graph
3. The graph loads and displays in the current view

[Screenshot: Upload button in header with file picker dialog]

Alternatively, drag and drop a JSON file anywhere on the page.

## Load from URL

1. Click the **Upload** button in the header
2. Select the **URL** tab
3. Enter the URL to a hosted Rivière graph
4. Click **Load**

[Screenshot: URL input dialog with example URL]

## Validation

Éclair validates the graph against the Rivière schema before loading. Invalid graphs display an error message explaining what's wrong.

Common validation errors:

| Error | Cause |
|-------|-------|
| Missing required field | Graph is missing `nodes`, `edges`, or `metadata` |
| Invalid node type | Node has a `type` not in the allowed list |
| Orphan edge | Edge references a node ID that doesn't exist |

## Example Graphs

If you don't have a graph yet, try one of the example graphs included with Rivière:

- `ecommerce-complete.json` — Full e-commerce system with multiple domains
- `simple-api.json` — Minimal API with a few endpoints

## Next Steps

- [Navigation](./navigation) — Learn how to pan, zoom, and interact
- [Full Graph View](./views/full-graph) — Explore the main visualization
