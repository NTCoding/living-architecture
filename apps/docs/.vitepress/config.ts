import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Living Architecture',
  description: 'Extract software architecture from code as living documentation',

  themeConfig: {
    logo: '/logo.svg',
    siteTitle: 'Living Architecture',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'Éclair', link: '/eclair/' },
      { text: 'CLI Reference', link: '/cli/' },
      { text: 'API Reference', link: '/api/' },
      { text: 'Concepts', link: '/concepts/graph-structure' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'AI Extraction', link: '/guide/ai-extraction' },
            { text: 'CLI Quick Start', link: '/guide/cli-quick-start' },
            { text: 'Library Quick Start', link: '/guide/quick-start' },
            { text: 'Library vs CLI', link: '/guide/library-vs-cli' },
            { text: 'Resources', link: '/guide/resources' },
          ]
        },
        {
          text: 'Extraction Steps',
          items: [
            { text: 'Overview', link: '/guide/extraction/' },
            { text: 'Step 1: Understand', link: '/guide/extraction/step-1-understand' },
            { text: 'Step 2: Define', link: '/guide/extraction/step-2-define-components' },
            { text: 'Step 3: Extract', link: '/guide/extraction/step-3-extract' },
            { text: 'Step 4: Link', link: '/guide/extraction/step-4-link' },
            { text: 'Step 5: Enrich', link: '/guide/extraction/step-5-enrich' },
            { text: 'Step 6: Validate', link: '/guide/extraction/step-6-validate' },
          ]
        }
      ],
      '/cli/': [
        {
          text: 'CLI Reference',
          items: [
            { text: 'Overview', link: '/cli/' },
            { text: 'Command Reference', link: '/cli/cli-reference' },
          ]
        }
      ],
      '/concepts/': [
        {
          text: 'Core Concepts',
          items: [
            { text: 'Graph Structure', link: '/concepts/graph-structure' },
            { text: 'ID Generation', link: '/concepts/id-generation' },
            { text: 'Validation Rules', link: '/concepts/validation-rules' },
            { text: 'Error Messages', link: '/concepts/error-messages' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'RiviereBuilder', link: '/api/riviere-builder' },
            { text: 'RiviereQuery', link: '/api/generated/riviere-query/classes/RiviereQuery' },
            { text: 'Types', link: '/api/generated/riviere-query/README' },
          ]
        }
      ],
      '/eclair/': [
        {
          text: 'User Guide',
          items: [
            { text: 'Introduction', link: '/eclair/' },
            { text: 'Getting Started', link: '/eclair/getting-started' },
            { text: 'Navigation', link: '/eclair/navigation' },
          ]
        },
        {
          text: 'Views',
          items: [
            { text: 'Overview', link: '/eclair/views/overview' },
            { text: 'Full Graph', link: '/eclair/views/full-graph' },
            { text: 'Domain Map', link: '/eclair/views/domain-map' },
            { text: 'Flows', link: '/eclair/views/flows' },
            { text: 'Entities', link: '/eclair/views/entities' },
            { text: 'Events', link: '/eclair/views/events' },
            { text: 'Compare', link: '/eclair/views/compare' },
            { text: 'Domain Detail', link: '/eclair/views/domain-detail' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ntcoding/living-architecture' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Living Architecture'
    }
  }
})
