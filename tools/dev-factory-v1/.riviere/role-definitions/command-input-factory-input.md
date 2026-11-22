# command-input-factory-input

## Purpose
A data-structure interface that holds the raw external input passed to a command-input-factory. Contains only data — no callable members.

## Behavioral Contract
1. A plain data structure (no methods, no callable properties)
2. Contains only primitive values, arrays, and nested data structures
3. Represents the shape of CLI options, HTTP request body, or other external input

## Anti-Patterns
- If it has callable members → it's a dependencies interface, not an input
- If it has domain logic → it's a value-object
