/**
 * @riviere-role domain-port
 * @riviere-role-justification This port checks the current availability of source files requested for an extraction. It does not restore state owned by RiviereProject.
 */
export type FindSpecifiedSourceFiles = (filePaths: readonly string[]) => {
  readonly filePaths: readonly string[]
  readonly missingFilePaths: readonly string[]
}
