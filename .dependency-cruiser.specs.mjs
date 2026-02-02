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
    },
    {
      name: "feature-structure",
      severity: "error",
      comment: "Feature files must live in structural subdirs (entrypoint/, commands/, queries/, domain/, components/, hooks/), not at feature root",
      from: {
        path: "features/[^/]+/(?!entrypoint/|commands/|queries/|domain/|infra/|components/|hooks/)[^/]+$"
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
