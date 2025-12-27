import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Rivière',
  description: 'Living Architecture - See how operations flow through your system',

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Rivière',

    nav: [
      { text: 'Get Started', link: '/get-started/' },
      { text: 'Extract', link: '/extract/' },
      { text: 'Visualize', link: '/visualize/' },
      { text: 'Reference', link: '/reference/schema/graph-structure' },
    ],

    sidebar: {
      '/get-started/': [
        {
          text: 'Get Started',
          items: [
            { text: 'Introduction', link: '/get-started/' },
            { text: 'CLI Quick Start', link: '/get-started/cli-quick-start' },
            { text: 'Library Quick Start', link: '/get-started/quick-start' },
            { text: 'Library vs CLI', link: '/get-started/library-vs-cli' },
            { text: 'Resources', link: '/get-started/resources' },
          ]
        }
      ],
      '/extract/': [
        {
          text: 'Rivière Extraction',
          items: [
            { text: 'Overview', link: '/extract/' },
          ]
        },
        {
          text: 'Extraction Steps',
          items: [
            { text: 'Workflow', link: '/extract/steps/' },
            { text: 'Step 1: Understand', link: '/extract/steps/step-1-understand' },
            { text: 'Step 2: Define', link: '/extract/steps/step-2-define-components' },
            { text: 'Step 3: Extract', link: '/extract/steps/step-3-extract' },
            { text: 'Step 4: Link', link: '/extract/steps/step-4-link' },
            { text: 'Step 5: Enrich', link: '/extract/steps/step-5-enrich' },
            { text: 'Step 6: Validate', link: '/extract/steps/step-6-validate' },
          ]
        }
      ],
      '/visualize/': [
        {
          text: 'Éclair',
          items: [
            { text: 'Introduction', link: '/visualize/' },
            { text: 'Getting Started', link: '/visualize/getting-started' },
            { text: 'Navigation', link: '/visualize/navigation' },
          ]
        },
        {
          text: 'Views',
          items: [
            { text: 'Overview', link: '/visualize/views/overview' },
            { text: 'Full Graph', link: '/visualize/views/full-graph' },
            { text: 'Domain Map', link: '/visualize/views/domain-map' },
            { text: 'Flows', link: '/visualize/views/flows' },
            { text: 'Entities', link: '/visualize/views/entities' },
            { text: 'Events', link: '/visualize/views/events' },
            { text: 'Compare', link: '/visualize/views/compare' },
            { text: 'Domain Detail', link: '/visualize/views/domain-detail' },
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Schema',
          items: [
            { text: 'Graph Structure', link: '/reference/schema/graph-structure' },
            { text: 'ID Generation', link: '/reference/schema/id-generation' },
            { text: 'Validation Rules', link: '/reference/schema/validation-rules' },
            { text: 'Error Messages', link: '/reference/schema/error-messages' },
          ]
        },
        {
          text: 'CLI',
          items: [
            { text: 'Overview', link: '/reference/cli/' },
            { text: 'Commands', link: '/reference/cli/cli-reference' },
          ]
        },
        {
          text: 'Library API',
          items: [
            { text: 'Overview', link: '/reference/api/' },
            { text: 'RiviereBuilder', link: '/api/generated/riviere-builder/classes/RiviereBuilder' },
            { text: 'RiviereQuery', link: '/api/generated/riviere-query/classes/RiviereQuery' },
            { text: 'Types', link: '/api/generated/riviere-query/README' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ntcoding/living-architecture' }
    ],

    footer: {
      message: 'Released under the MIT License. Created by <a href="https://nick-tune.me">Nick Tune</a> (<a href="https://linkedin.com/in/nick-tune">LinkedIn</a>, <a href="https://github.com/ntcoding">GitHub</a>)',
      copyright: 'Copyright © 2025 Rivière'
    }
  }
})
