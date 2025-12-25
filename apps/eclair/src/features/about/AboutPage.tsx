const GITHUB_REPO_URL = 'https://github.com/ntcoding/riviere'

const EXAMPLE_SCHEMA = `{
  "version": "1.0",
  "metadata": {
    "name": "Order Placement Flow",
    "description": "End-to-end order placement"
  },
  "nodes": [
    {
      "id": "ui:checkout:place-order-form",
      "type": "UI",
      "name": "Place Order Form",
      "domain": "checkout",
      "module": "pages",
      "sourceLocation": {
        "repository": "ecommerce-app",
        "filePath": "src/pages/PlaceOrder.tsx",
        "lineNumber": 42
      }
    },
    {
      "id": "orders:api:post-orders",
      "type": "API",
      "name": "POST /orders",
      "domain": "orders",
      "module": "api",
      "apiType": "REST",
      "httpMethod": "POST",
      "path": "/orders"
    }
  ],
  "edges": [
    {
      "source": "ui:checkout:place-order-form",
      "target": "orders:api:post-orders",
      "type": "invokes",
      "flowType": "sync"
    }
  ]
}`

interface NodeTypeCardProps {
  icon: string
  name: string
  description: string
}

function NodeTypeCard({ icon, name, description }: NodeTypeCardProps): React.ReactElement {
  return (
    <div className="flex items-start gap-4 p-4 rounded-[var(--radius)] bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--primary)] hover:shadow-md transition-all duration-200">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
        <i className={`ph ph-${icon} text-xl text-[var(--primary)]`} aria-hidden="true" />
      </div>
      <div>
        <h3 className="font-semibold text-[var(--text-primary)] mb-1">{name}</h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

interface EdgeTypeItemProps {
  name: string
  description: string
}

function EdgeTypeItem({ name, description }: EdgeTypeItemProps): React.ReactElement {
  return (
    <li className="flex items-start gap-3 py-2">
      <span className="text-[var(--primary)] font-bold">→</span>
      <div>
        <span className="font-semibold text-[var(--text-primary)]">{name}</span>
        <span className="text-[var(--text-secondary)]"> – {description}</span>
      </div>
    </li>
  )
}

export function AboutPage(): React.ReactElement {
  return (
    <div className="max-w-4xl">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-3">
          About Rivière
        </h1>
        <p className="text-lg text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          A language-agnostic JSON format for representing flow-based software architecture.
          Capture how operations and data flow through your end-to-end processes.
        </p>
      </header>

      <div className="rounded-[var(--radius)] border-l-4 border-[var(--primary)] bg-gradient-to-r from-[var(--primary)]/5 to-transparent p-5 mb-10">
        <p className="text-[var(--text-secondary)] leading-relaxed">
          The name <strong className="text-[var(--text-primary)]">"Rivière"</strong> (French for "river")
          reflects how data flows through your system like water through a river with multiple
          tributaries (entry points) and branches (parallel flows).
        </p>
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 pb-3 border-b border-[var(--border-color)]">
          Node Types
        </h2>
        <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">
          Nodes represent components in your architecture. These are the standard types—the schema
          is extensible so you can define additional types for your specific needs:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NodeTypeCard
            icon="browser"
            name="UI"
            description="User-facing screens, pages, and interactive forms"
          />
          <NodeTypeCard
            icon="plug"
            name="API"
            description="REST endpoints, GraphQL mutations, gRPC services, or webhooks"
          />
          <NodeTypeCard
            icon="git-branch"
            name="Use Case"
            description="Application services that orchestrate domain operations"
          />
          <NodeTypeCard
            icon="cube"
            name="Domain Operation"
            description="Actions that happen in the domain"
          />
          <NodeTypeCard
            icon="broadcast"
            name="Domain Event"
            description="Events published and consumed asynchronously within or across domains"
          />
          <NodeTypeCard
            icon="funnel"
            name="Event Handler"
            description="Consumes events published from the same or a different domain"
          />
          <NodeTypeCard
            icon="gear"
            name="Custom"
            description="Scheduled jobs, batch processes, or other custom components"
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 pb-3 border-b border-[var(--border-color)]">
          Edge Types
        </h2>
        <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
          Edges represent flow relationships between nodes:
        </p>
        <ul className="space-y-1">
          <EdgeTypeItem name="invokes" description="Synchronous calls where the caller waits for a response" />
          <EdgeTypeItem name="publishes" description="Asynchronous event emission where the publisher does not wait" />
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 pb-3 border-b border-[var(--border-color)]">
          Example Schema
        </h2>
        <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
          Here's a simple Rivière graph showing a UI form invoking an API endpoint:
        </p>
        <div className="rounded-[var(--radius)] bg-[var(--bg-tertiary)] border border-[var(--border-color)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
            <span className="text-xs font-mono text-[var(--text-tertiary)]">order-flow.json</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(EXAMPLE_SCHEMA)}
              className="text-xs text-[var(--text-tertiary)] hover:text-[var(--primary)] transition-colors flex items-center gap-1"
            >
              <i className="ph ph-copy" aria-hidden="true" />
              Copy
            </button>
          </div>
          <pre className="p-4 overflow-x-auto">
            <code className="text-sm font-mono text-[var(--text-primary)] leading-relaxed whitespace-pre">
              {EXAMPLE_SCHEMA}
            </code>
          </pre>
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--primary)]/10 via-[var(--primary)]/5 to-transparent border border-[var(--primary)]/20 p-8">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
          Get Started
        </h2>
        <p className="text-[var(--text-secondary)] mb-6 leading-relaxed max-w-xl">
          Full schema documentation, extraction tools, and examples are available on GitHub.
        </p>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--radius)] bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark,var(--primary))] text-white font-semibold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
        >
          <i className="ph ph-github-logo text-lg" aria-hidden="true" />
          View on GitHub
          <i className="ph ph-arrow-up-right text-sm" aria-hidden="true" />
        </a>
      </section>
    </div>
  )
}
