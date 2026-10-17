/**
 * Declaration for the Deno-style zod specifier that Swamp extension sources
 * import. Swamp's own bundler resolves `npm:` specifiers; the repository's
 * TypeScript project cannot, so the specifier is declared here and mapped to
 * the zod version Swamp compiles against.
 */
declare module 'npm:zod@4.3.6' {
  export * from 'zod/v4'
}
