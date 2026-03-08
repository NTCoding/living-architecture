# query-facade

## Purpose

`query-facade` exposes read-focused application behavior for a feature query slice.

## Placement

- Put the class under a feature `queries/` location.
- Keep it in a file matched by the role config's allowed locations.

## Naming

- Name the class with a `Query` suffix.

## Allowed Public Methods

- Only expose `components` and `validate`.
- Keep helper behavior private.

## What To Keep Out

- Do not format CLI output here.
- Do not perform shell startup wiring here.
- Do not mix write-side orchestration into this class.
