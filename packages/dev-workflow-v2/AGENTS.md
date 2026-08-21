# Dev Workflow Packages

Code in these packages is not automatically available to an installed Codex plugin. Keep its Rivière role and location intact. The plugin may import it while the repository builds a bundled runtime, but the installed plugin must not resolve it through `workspace:*`.
