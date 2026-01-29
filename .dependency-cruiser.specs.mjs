export default {
  forbidden: [
    {
      name: "specs-must-be-colocated",
      severity: "error",
      comment: "Spec files must live next to their production code, not at src/ root",
      from: {
        path: "(apps|packages|tools)/(?!riviere-schema/|riviere-extract-config/|riviere-extract-conventions/)[^/]+/src/(?!features/|platform/|shell/|domain/|queries/).+",
        pathNot: ["main\\.tsx$", "index\\.ts$", "test/", "test-assertions\\.ts$"]
      },
      to: {}
    }
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    exclude: ["dist/", "\\.d\\.ts$", "__fixtures__"]
  }
};
