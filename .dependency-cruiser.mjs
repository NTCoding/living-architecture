export default {
  forbidden: [
    {
      name: "root-structure",
      severity: "error",
      comment: "src/ root must only contain structural folders (features/, platform/, shell/, domain/, queries/)",
      from: { path: "(apps|packages|tools)/(?!riviere-schema/|riviere-extract-config/|riviere-extract-conventions/)[^/]+/src/(?!features/|platform/|shell/|domain/|queries/).+" },
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
      comment: "Features contain only entrypoint/, commands/, queries/, domain/, infra/",
      from: { path: "features/[^/]+/(?!entrypoint/|commands/|queries/|domain/|infra/)[^/]+/.+" },
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
      comment: "Entrypoint may only import from commands/, queries/, own infra/, platform/infra/",
      from: { path: "features/([^/]+)/entrypoint/.+" },
      to: {
        path: "(features|platform|shell)/",
        pathNot: "(features/$1/(commands|queries|infra)/|platform/infra/)"
      }
    },
    {
      name: "entrypoint-no-persistence-infra",
      severity: "error",
      comment: "Entrypoint must not import from persistence or external-client infrastructure",
      from: { path: "features/[^/]+/entrypoint/.+" },
      to: { path: "platform/infra/(persistence|external-clients)/.+" }
    },
    {
      name: "domain-no-upward-deps",
      severity: "error",
      comment: "Domain must not import from commands/, queries/, entrypoint/, or shell/",
      from: { path: "features/[^/]+/domain/.+" },
      to: { path: "(features/[^/]+/(commands|queries|entrypoint)/|shell/).+" }
    },
    {
      name: "domain-no-infra",
      severity: "error",
      comment: "Domain must never import from any infra/",
      from: { path: "domain/.+" },
      to: { path: "(platform/infra|features/[^/]+/infra)/.+" }
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
      name: "commands-no-entrypoint",
      severity: "error",
      comment: "Commands must not import from entrypoint/",
      from: { path: "features/[^/]+/commands/.+" },
      to: { path: "features/[^/]+/entrypoint/.+" }
    },
    {
      name: "commands-no-http-infra",
      severity: "error",
      comment: "Commands must not import from http infrastructure",
      from: { path: "features/[^/]+/commands/.+" },
      to: { path: "platform/infra/http/.+" }
    },
    {
      name: "commands-no-cli-infra",
      severity: "error",
      comment: "Commands must not import from CLI infrastructure (entrypoint concern)",
      from: { path: "features/[^/]+/commands/.+" },
      to: { path: "platform/infra/cli/.+" }
    },
    {
      name: "commands-no-mappers",
      severity: "error",
      comment: "Commands must not import from feature mappers",
      from: { path: "features/[^/]+/commands/.+" },
      to: { path: "features/[^/]+/infra/mappers/.+" }
    },
    {
      name: "commands-no-middleware",
      severity: "error",
      comment: "Commands must not import from feature middleware",
      from: { path: "features/[^/]+/commands/.+" },
      to: { path: "features/[^/]+/infra/middleware/.+" }
    },
    {
      name: "queries-no-commands",
      severity: "error",
      comment: "Queries must not import from commands/",
      from: { path: "features/[^/]+/queries/.+" },
      to: { path: "features/[^/]+/commands/.+" }
    },
    {
      name: "queries-no-entrypoint",
      severity: "error",
      comment: "Queries must not import from entrypoint/",
      from: { path: "features/[^/]+/queries/.+" },
      to: { path: "features/[^/]+/entrypoint/.+" }
    },
    {
      name: "queries-no-messaging",
      severity: "error",
      comment: "Queries must not import from messaging infrastructure",
      from: { path: "features/[^/]+/queries/.+" },
      to: { path: "platform/infra/messaging/.+" }
    },
    {
      name: "queries-no-cli-infra",
      severity: "error",
      comment: "Queries must not import from CLI infrastructure (entrypoint concern)",
      from: { path: "features/[^/]+/queries/.+" },
      to: { path: "platform/infra/cli/.+" }
    },
    {
      name: "queries-no-mappers",
      severity: "error",
      comment: "Queries must not import from feature mappers",
      from: { path: "features/[^/]+/queries/.+" },
      to: { path: "features/[^/]+/infra/mappers/.+" }
    },
    {
      name: "queries-no-middleware",
      severity: "error",
      comment: "Queries must not import from feature middleware",
      from: { path: "features/[^/]+/queries/.+" },
      to: { path: "features/[^/]+/infra/middleware/.+" }
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
      name: "shell-no-commands",
      severity: "error",
      comment: "Shell must not import from commands/ directly (wire via entrypoint)",
      from: { path: "[^/]+/src/shell/.+" },
      to: { path: "features/[^/]+/commands/.+" }
    },
    {
      name: "shell-no-queries",
      severity: "error",
      comment: "Shell must not import from queries/ directly (wire via entrypoint)",
      from: { path: "[^/]+/src/shell/.+" },
      to: { path: "features/[^/]+/queries/.+" }
    },
    {
      name: "platform-no-features",
      severity: "error",
      comment: "Platform must not import from features/",
      from: { path: "platform/.+" },
      to: { path: "features/.+" }
    },
    {
      name: "commands-no-peer-imports",
      severity: "error",
      comment: "Commands are independent orchestrators — peer imports indicate misplaced utilities",
      from: { path: "features/([^/]+)/commands/[^/]+" },
      to: { path: "features/$1/commands/[^/]+" }
    },
    {
      name: "no-circular",
      severity: "error",
      comment: "No circular dependencies",
      from: {},
      to: { circular: true }
    }
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.base.json" },
    exclude: ["dist/", "\\.spec\\.", "\\.test\\.", "\\.d\\.ts$", "__fixtures__"]
  }
};
