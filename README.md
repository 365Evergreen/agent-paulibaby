# agent-paulibaby — Think agent with Code Mode

A stateful AI chat agent built with `@cloudflare/think`, running on
**`@cf/moonshotai/kimi-k2.7-code`** with `reasoningEffort: "low"`.

## Features

| Feature | How |
|---|---|
| **Streaming chat** | WebSocket, resumable across page refreshes |
| **Persistent memory** | Durable Object SQLite |
| **Workspace file tools** | `read`, `ls`, `find`, `grep`, `write`, `edit`, `delete`, `exec` (built-in) |
| **Code Mode (server)** | `codemode` tool — model writes JS that orchestrates tools in one block (up to 80% token savings) |
| **Code Mode (browser)** | Browser-owned tools run in a sandboxed iframe via `IframeSandboxExecutor` |
| **Code Mode MCP server** | Access-protected standalone Code Mode MCP Worker |
| **MCP connector** | GitHub MCP tools as `github.*`; unknown and mutating tools require approval |
| **ToolSetConnector** | Custom AI SDK tools as `operations.*` |
| **Human-in-the-loop** | Pending approvals, approve/reject, rollback — all durable |
| **Tracing** | Model turns, tool calls, approvals in the dashboard |

## Repo structure

```
agent-paulibaby/
├── apps/
│   ├── gateway/src/index.ts       # Access validation, tenant routing, and errors
│   ├── mcp-code-server/           # Independently configured Code Mode MCP service
│   ├── mcp-openapi-server/        # Access-protected OpenAPI MCP service
│   └── web/                       # React UI and browser-only tools
├── packages/
│   ├── auth/                      # Cloudflare Access JWT and tenant identity
│   ├── agents/think/              # Durable Think agent and stateless variant
│   ├── connectors/                # Secret-backed GitHub MCP connector
│   └── contracts/                 # Delegation, streaming, approval, error schemas
├── vite.config.ts                 # Vite + Cloudflare Worker integration
├── wrangler.jsonc                 # Root config preserves local state and DO identity
├── package.json                   # Workspace scripts and dependencies
├── tsconfig.json                  # Repository-wide TypeScript check
└── README.md                      # This file
```

The target package boundaries, dependency rules, and monorepo conventions are
defined in [design/monorepo-boundaries.md](design/monorepo-boundaries.md).
See [Access and approvals](docs/agents/access-and-approvals.md) for required
Cloudflare Access settings, secret setup, tenant routing, and tool policy, and
[specialist onboarding](docs/agents/specialist-agent-onboarding.md) for adding
future agents.
The UI remains hosted by the same Cloudflare Worker through the Vite plugin.
`wrangler.jsonc` stays at the repository root so local Durable Object state
continues using the existing `.wrangler/state` directory.

## Four Code Mode surfaces

### 1. Server Code Mode — durable runtime (`packages/agents/think/src/agent.ts`)

`createCodemodeRuntime()` with `DynamicWorkerExecutor`. The model writes one JS
function that calls `workspace.*`, `github.*`, and `operations.*` methods.
Execution history, approvals, rollback, and snippets are stored in SQLite.

### 2. Server Code Mode — stateless (`packages/agents/think/src/server-simple.ts`)

`createCodeTool()` — an experimental variant with no durable execution state.
The root Worker uses the durable Think implementation and its secret-backed
GitHub connector.

### 3. Browser Code Mode (`apps/web/src/codemode-tool.ts` + `apps/web/src/client.tsx`)

`createBrowserCodeTool()` with `IframeSandboxExecutor`. The model writes JS that
calls browser-owned tools (timezone, clipboard, geolocation, localStorage).
Code runs in a sandboxed iframe on the page — the server never sees the tool
implementations or the generated code.

### 4. Code Mode MCP services (`apps/mcp-code-server` + `apps/mcp-openapi-server`)

These are separate, Access-protected services. The Code Mode server exposes one
`code` tool; generated JavaScript runs in an isolated Dynamic Worker.

Two patterns from `@cloudflare/codemode/mcp`:

| Function | Input | Output |
|---|---|---|
| `codeMcpServer({ server, executor })` | An existing `McpServer` | A wrapped `McpServer` with one `code` tool |
| `openApiMcpServer({ spec, executor, request })` | An OpenAPI spec + host request function | An `McpServer` with `search` and `execute` tools |

Both services have separate Wrangler configs, require Cloudflare Access, and
disable `workers.dev` by default. Configure a protected custom domain before
making either endpoint available to MCP clients.
They currently use the Agents SDK's explicit SDK v1 compatibility handler
because `@cloudflare/codemode` provides an SDK v1 `McpServer`; migrate to the
stateless v2 handler when the Code Mode MCP API supports it.

## Connectors

### MCP connector (`packages/connectors/src/github-connector.ts`)

Connects to GitHub's MCP endpoint at runtime with the `GITHUB_TOKEN` Worker
secret. Only an explicit read-only allowlist runs directly; mutations and
unknown upstream tools pause for approval. The bearer token is not persisted in
Durable Object state.

### ToolSetConnector (in `packages/agents/think/src/agent.ts`)

Exposes AI SDK tools as `operations.*`. The model calls
`operations.getServerTime()`, `operations.echo()`, etc. from generated code.

## Human-in-the-loop approvals

The durable runtime (`packages/agents/think/src/agent.ts`) exposes three `@callable` methods:

- `pendingApprovals()` — list paused executions waiting for review
- `approveExecution(executionId)` — approve and resume
- `rejectExecution(executionId, seq)` — reject and stop

The client (`apps/web/src/client.tsx`) polls `pendingApprovals()` every 2 seconds,
shows the exact tool arguments, and offers Approve/Reject buttons. Sensitive
browser tools also request explicit browser confirmation.

## Setup

```sh
npm install
```

Before using the agent, configure `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and
`CF_ACCESS_ALLOWED_GROUP_IDS` for the gateway. Configure the Access application
policy with the same allowed groups. Set the GitHub credential with:

```powershell
npx wrangler secret put GITHUB_TOKEN --config wrangler.jsonc
```

Set `LEGACY_STATE_OWNER_SUBJECT` to the verified owner of the previous
`default` Durable Object before deploying if that existing conversation state
must remain available to that user. The gateway fails closed until Access is
configured.

## Develop

```sh
npm run dev
```

## Deploy

```sh
npm run deploy
```

## Worker entry point and local state

`wrangler.jsonc` keeps `apps/gateway/src/index.ts` as the entry point. The
gateway exports the existing `PaulibabyAgent` and `CodemodeRuntime` classes
from the Think workspace. Keep the Worker name, Durable Object class and
binding names, and migration history unchanged when editing this configuration.
The original `v1` migration created `OpenCodeAgent`; `v2` renames that
namespace to `PaulibabyAgent` without deleting its stored data.
The stateless Think variant and standalone MCP examples are not production
entrypoints in this configuration.

## Notes

- **Model**: `@cf/moonshotai/kimi-k2.7-code`. Change `MODEL_ID` to switch.
- **Migration tags**: Preserve the original `v1` and the `v2` class rename;
  append a new unique tag for future Durable Object changes.
- **GitHub token**: Set it as a Worker secret; never add it to Wrangler config
  or agent state.
- **OpenAPI MCP auth**: Set `API_TOKEN` as a secret and `API_BASE_URL` as an
  HTTPS-origin variable for the separately configured MCP service.
- **Code Mode is experimental** and may introduce breaking changes.
