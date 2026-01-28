export default {
  forbidden: [
    {
      name: "root-structure",
      severity: "error",
      comment: "Package root must only contain features/, platform/, shell/",
      from: { path: "apps/[^/]+/src/(?!features/|platform/|shell/).+" },
      to: {}
    },
    {
      name: "platform-structure",
      severity: "error",
      comment: "platform/ contains only domain/ and infra/",
      from: { path: "platform/(?!domain/|infra/)[^/]+/.+" },
      to: {}
    },
    {
      name: "feature-structure",
      severity: "error",
      comment: "Features contain only entrypoint/, commands/, queries/, domain/",
      from: { path: "features/[^/]+/(?!entrypoint/|commands/|queries/|domain/)[^/]+/.+" },
      to: {}
    },
    {
      name: "no-nested-commands",
      severity: "error",
      comment: "commands/ must be flat — no nested folders",
      from: { path: "features/[^/]+/commands/[^/]+/.+" },
      to: {}
    },
    {
      name: "no-nested-queries",
      severity: "error",
      comment: "queries/ must be flat — no nested folders",
      from: { path: "features/[^/]+/queries/[^/]+/.+" },
      to: {}
    },
    {
      name: "entrypoint-no-domain",
      severity: "error",
      comment: "Entrypoint must never import from domain/",
      from: { path: "features/[^/]+/entrypoint/.+" },
      to: { path: "(features/[^/]+/domain/|platform/domain/).+" }
    },
    {
      name: "entrypoint-restricted-deps",
      severity: "error",
      comment: "Entrypoint may only import from commands/, queries/, platform/infra/",
      from: { path: "features/([^/]+)/entrypoint/.+" },
      to: {
        path: "(features|platform|shell)/",
        pathNot: "(features/$1/(commands|queries)/|platform/infra/)"
      }
    },
    {
      name: "domain-no-upward-deps",
      severity: "error",
      comment: "Domain must not import from commands/, queries/, entrypoint/, or shell/",
      from: { path: "features/[^/]+/domain/.+" },
      to: { path: "(features/[^/]+/(commands|queries|entrypoint)/|shell/).+" }
    },
    {
      name: "no-cross-feature-imports",
      severity: "error",
      comment: "Features must not import from other features",
      from: { path: "features/([^/]+)/.+" },
      to: {
        path: "features/([^/]+)/.+",
        pathNot: "features/$1/.+"
      }
    },
    {
      name: "commands-no-cross-feature",
      severity: "error",
      comment: "Commands forbidden from other features",
      from: { path: "features/([^/]+)/commands/.+" },
      to: {
        path: "features/([^/]+)/.+",
        pathNot: "features/$1/.+"
      }
    },
    {
      name: "queries-no-commands",
      severity: "error",
      comment: "Queries must not import from commands/",
      from: { path: "features/[^/]+/queries/.+" },
      to: { path: "features/[^/]+/commands/.+" }
    },
    {
      name: "commands-no-queries",
      severity: "error",
      comment: "Commands must not import from queries/",
      from: { path: "features/[^/]+/commands/.+" },
      to: { path: "features/[^/]+/queries/.+" }
    },
    {
      name: "shell-no-domain",
      severity: "error",
      comment: "Shell must not import from domain/",
      from: { path: "shell/.+" },
      to: { path: "(features/[^/]+/domain/|platform/domain/).+" }
    },
    {
      name: "platform-no-features",
      severity: "error",
      comment: "Platform must not import from features/",
      from: { path: "platform/.+" },
      to: { path: "features/.+" }
    },
    {
      name: "no-circular",
      severity: "error",
      comment: "No circular dependencies",
      from: {},
      to: { circular: true }
    }
  ],

  required: [
    {
      name: "commands-must-use-domain",
      severity: "error",
      comment: "Every command MUST import from domain/",
      module: { path: "features/([^/]+)/commands/[^/]+\\.ts$" },
      to: { path: "features/$1/domain/.+" }
    }
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    exclude: ["dist/", "\\.spec\\.", "\\.test\\.", "\\.d\\.ts$"]
  }
};
