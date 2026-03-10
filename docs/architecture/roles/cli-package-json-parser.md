# cli-package-json-parser

## Purpose

`cli-package-json-parser` validates package metadata needed by CLI shell startup.

## Placement

- Put the symbol under `shell/` when it only supports shell bootstrap.
- Keep it in a file matched by the role config's allowed locations.

## Naming

- Use `parsePackageJson`.

## Allowed Public Methods

- This role is for standalone functions.
- Do not introduce class APIs for this role.

## What To Keep Out

- Do not create CLI commands here.
- Do not perform filesystem reads here.
- Do not format user-facing output here.
