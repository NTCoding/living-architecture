import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Rivière',
  description: 'Living Architecture - See how operations flow through your system',

  // Ignore /eclair/ links - they're valid but point to a separate app on the same domain
  ignoreDeadLinks: [/^\/eclair\//],

  head: [
    [
      'link',
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
    ],
    [
      'meta',
      {
        property: 'og:type',
        content: 'website',
      },
    ],
    [
      'meta',
      {
        property: 'og:title',
        content: 'Rivière - Living Architecture',
      },
    ],
    [
      'meta',
      {
        property: 'og:description',
        content: 'See how operations flow through your system',
      },
    ],
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://living-architecture.dev/og-preview.png',
      },
    ],
    [
      'meta',
      {
        property: 'og:url',
        content: 'https://living-architecture.dev',
      },
    ],
    [
      'meta',
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    [
      'meta',
      {
        name: 'twitter:title',
        content: 'Rivière - Living Architecture',
      },
    ],
    [
      'meta',
      {
        name: 'twitter:description',
        content: 'See how operations flow through your system',
      },
    ],
    [
      'meta',
      {
        name: 'twitter:image',
        content: 'https://living-architecture.dev/og-preview.png',
      },
    ],
  ],

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Rivière',

    nav: [
      {
        text: 'Get Started',
        link: '/get-started/',
      },
      {
        text: 'Extract',
        link: '/extract/',
      },
      {
        text: 'Visualize',
        link: '/visualize/',
      },
      {
        text: 'Reference',
        link: '/reference/schema/graph-structure',
      },
    ],

    sidebar: {
      '/api/': [
        {
          text: 'Library API',
          items: [
            {
              text: 'Overview',
              link: '/reference/api/',
            },
            {
              text: 'RiviereBuilder',
              link: '/api/generated/riviere-builder/classes/RiviereBuilder',
            },
            {
              text: 'RiviereQuery',
              link: '/api/generated/riviere-query/classes/RiviereQuery',
            },
            {
              text: 'Types',
              link: '/api/generated/riviere-query/README',
            },
            {
              text: 'ID Generation',
              link: '/reference/api/id-generation',
            },
            {
              text: 'Validation Rules',
              link: '/reference/api/validation-rules',
            },
            {
              text: 'Error Messages',
              link: '/reference/api/error-messages',
            },
          ],
        },
      ],
      '/get-started/': [
        {
          text: 'Get Started',
          items: [
            {
              text: 'Introduction',
              link: '/get-started/',
            },
            {
              text: 'CLI Quick Start',
              link: '/get-started/cli-quick-start',
            },
            {
              text: 'Library Quick Start',
              link: '/get-started/quick-start',
            },
            {
              text: 'Library vs CLI',
              link: '/get-started/library-vs-cli',
            },
            {
              text: 'Resources',
              link: '/get-started/resources',
            },
          ],
        },
      ],
      '/extract/': [
        {
          text: 'Extraction',
          items: [
            {
              text: 'Overview',
              link: '/extract/',
            },
          ],
        },
        {
          text: 'AI-Assisted Extraction',
          items: [
            {
              text: 'Workflow',
              link: '/extract/steps/',
            },
            {
              text: 'Step 1: Understand',
              link: '/extract/steps/step-1-understand',
            },
            {
              text: 'Step 2: Define',
              link: '/extract/steps/step-2-define-components',
            },
            {
              text: 'Step 3: Extract',
              link: '/extract/steps/step-3-extract',
            },
            {
              text: 'Step 4: Link',
              link: '/extract/steps/step-4-link',
            },
            {
              text: 'Step 5: Enrich',
              link: '/extract/steps/step-5-enrich',
            },
            {
              text: 'Step 6: Validate',
              link: '/extract/steps/step-6-validate',
            },
          ],
        },
        {
          text: 'TypeScript Extraction',
          items: [
            {
              text: 'Workflow',
              link: '/extract/deterministic/typescript/workflow/',
            },
            {
              text: 'Step 1: Understand',
              link: '/extract/deterministic/typescript/workflow/step-1-understand',
            },
            {
              text: 'Step 2: Define',
              link: '/extract/deterministic/typescript/workflow/step-2-define',
            },
            {
              text: 'Step 3: Extract',
              link: '/extract/deterministic/typescript/workflow/step-3-extract',
            },
            {
              text: 'Step 4: Link',
              link: '/extract/deterministic/typescript/workflow/step-4-link',
            },
            {
              text: 'Step 5: Enrich',
              link: '/extract/deterministic/typescript/workflow/step-5-enrich',
            },
            {
              text: 'Step 6: Validate',
              link: '/extract/deterministic/typescript/workflow/step-6-validate',
            },
            {
              text: 'Enforcement',
              link: '/extract/deterministic/typescript/enforcement',
            },
          ],
        },
      ],
      '/visualize/': [
        {
          text: 'Éclair',
          items: [
            {
              text: 'Introduction',
              link: '/visualize/',
            },
            {
              text: 'Getting Started',
              link: '/visualize/getting-started',
            },
          ],
        },
        {
          text: 'Views',
          items: [
            {
              text: 'Overview',
              link: '/visualize/views/overview',
            },
            {
              text: 'Full Graph',
              link: '/visualize/views/full-graph',
            },
            {
              text: 'Domain Map',
              link: '/visualize/views/domain-map',
            },
            {
              text: 'Flows',
              link: '/visualize/views/flows',
            },
            {
              text: 'Entities',
              link: '/visualize/views/entities',
            },
            {
              text: 'Events',
              link: '/visualize/views/events',
            },
            {
              text: 'Compare',
              link: '/visualize/views/compare',
            },
            {
              text: 'Domain Detail',
              link: '/visualize/views/domain-detail',
            },
          ],
        },
      ],
      '/reference/': [
        {
          text: 'Schema',
          items: [
            {
              text: 'Graph Structure',
              link: '/reference/schema/graph-structure',
            },
          ],
        },
        {
          text: 'Extraction Config',
          items: [
            {
              text: 'Schema',
              link: '/reference/extraction-config/schema',
            },
            {
              text: 'Predicates',
              link: '/reference/extraction-config/predicates',
            },
            {
              text: 'Decorators',
              link: '/reference/extraction-config/decorators',
            },
            {
              text: 'Examples',
              link: '/reference/extraction-config/examples',
            },
          ],
        },
        {
          text: 'CLI',
          items: [
            {
              text: 'Overview',
              link: '/reference/cli/',
            },
            {
              text: 'Commands',
              link: '/reference/cli/cli-reference',
            },
          ],
        },
        {
          text: 'Library API',
          items: [
            {
              text: 'Overview',
              link: '/reference/api/',
            },
            {
              text: 'RiviereBuilder',
              link: '/api/generated/riviere-builder/classes/RiviereBuilder',
            },
            {
              text: 'RiviereQuery',
              link: '/api/generated/riviere-query/classes/RiviereQuery',
            },
            {
              text: 'Types',
              link: '/api/generated/riviere-query/README',
            },
            {
              text: 'ID Generation',
              link: '/reference/api/id-generation',
            },
            {
              text: 'Validation Rules',
              link: '/reference/api/validation-rules',
            },
            {
              text: 'Error Messages',
              link: '/reference/api/error-messages',
            },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/ntcoding/living-architecture',
      },
    ],

    footer: {
      message:
        'Released under the Apache 2.0 License. Created by <a href="https://nick-tune.me">Nick Tune</a> (<a href="https://bsky.app/profile/nick-tune.me">Bluesky</a>, <a href="https://linkedin.com/in/nick-tune">LinkedIn</a>, <a href="https://github.com/ntcoding">GitHub</a>)',
    },
  },
})
