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
| **Code Mode MCP server** | Publish a Code Mode MCP server any MCP client can connect to |
| **MCP connector** | GitHub MCP tools as `github.*` with approval-gated `create_issue` |
| **ToolSetConnector** | Custom AI SDK tools as `operations.*` |
| **Human-in-the-loop** | Pending approvals, approve/reject, rollback — all durable |
| **Tracing** | Model turns, tool calls, approvals in the dashboard |

## Repo structure

```
agent-paulibaby/
├── apps/
│   ├── gateway/src/index.ts       # Worker routing and error responses
│   └── web/                       # React UI and browser-only tools
├── packages/
│   ├── agents/think/              # Durable Think agent and stateless variant
│   ├── connectors/                # GitHub MCP connector
│   └── contracts/                 # Delegation, streaming, approval, error schemas
├── src/                           # Standalone MCP examples (pending follow-up task)
├── vite.config.ts                 # Vite + Cloudflare Worker integration
├── wrangler.jsonc                 # Root config preserves local state and DO identity
├── package.json                   # Workspace scripts and dependencies
├── tsconfig.json                  # Repository-wide TypeScript check
└── README.md                      # This file
```

The target package boundaries, dependency rules, and monorepo conventions are
defined in [design/monorepo-boundaries.md](design/monorepo-boundaries.md).
The UI remains hosted by the same Cloudflare Worker through the Vite plugin.
`wrangler.jsonc` stays at the repository root so local Durable Object state
continues using the existing `.wrangler/state` directory.

## Four Code Mode surfaces

### 1. Server Code Mode — durable runtime (`packages/agents/think/src/agent.ts`)

`createCodemodeRuntime()` with `DynamicWorkerExecutor`. The model writes one JS
function that calls `workspace.*`, `github.*`, and `operations.*` methods.
Execution history, approvals, rollback, and snippets are stored in SQLite.

### 2. Server Code Mode — stateless (`packages/agents/think/src/server-simple.ts`)

`createCodeTool()` — same orchestration, no durable state. Includes MCP tools
via `this.mcp.getAITools()`.

### 3. Browser Code Mode (`apps/web/src/codemode-tool.ts` + `apps/web/src/client.tsx`)

`createBrowserCodeTool()` with `IframeSandboxExecutor`. The model writes JS that
calls browser-owned tools (timezone, clipboard, geolocation, localStorage).
Code runs in a sandboxed iframe on the page — the server never sees the tool
implementations or the generated code.

### 4. Code Mode MCP server (`src/mcp-server.ts` + `src/openapi-mcp-server.ts`)

Publish a Code Mode MCP server that any MCP client can connect to. Instead of
advertising each tool separately, the server exposes one `code` tool. The model
writes JavaScript against a `codemode` namespace and the code runs in an
isolated Dynamic Worker.

Two patterns from `@cloudflare/codemode/mcp`:

| Function | Input | Output |
|---|---|---|
| `codeMcpServer({ server, executor })` | An existing `McpServer` | A wrapped `McpServer` with one `code` tool |
| `openApiMcpServer({ spec, executor, request })` | An OpenAPI spec + host request function | An `McpServer` with `search` and `execute` tools |

Connect any MCP client at `https://<YOUR_WORKER>.<YOUR_SUBDOMAIN>.workers.dev/mcp`.

## Connectors

### MCP connector (`packages/connectors/src/github-connector.ts`)

Wraps a GitHub MCP server. All tools become `github.*` methods. The
`create_issue` tool is marked `requiresApproval: true` — the runtime pauses
before executing it and returns a pending approval to the client.

### ToolSetConnector (in `packages/agents/think/src/agent.ts`)

Exposes AI SDK tools as `operations.*`. The model calls
`operations.getServerTime()`, `operations.echo()`, etc. from generated code.

## Human-in-the-loop approvals

The durable runtime (`packages/agents/think/src/agent.ts`) exposes three `@callable` methods:

- `pendingApprovals()` — list paused executions waiting for review
- `approveExecution(executionId)` — approve and resume
- `rejectExecution(executionId, seq)` — reject and stop

The client (`apps/web/src/client.tsx`) polls `pendingApprovals()` every 2 seconds and
shows Approve/Reject buttons when approvals are pending.

## Setup

```sh
npm install
```

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
The stateless Think variant and standalone MCP examples are not production
entrypoints in this configuration.

## Notes

- **Model**: `@cf/moonshotai/kimi-k2.7-code`. Change `MODEL_ID` to switch.
- **Migration tag**: Uses `"v1"`. Bump to `"v2"` if your existing `OpenCodeAgent`
  already deployed a `"v1"` migration.
- **GitHub token**: Replace `YOUR_GITHUB_TOKEN` in `wrangler.jsonc` with a real
  token, or remove the `mcp` section if you don't need GitHub integration.
- **MCP server auth**: Replace `YOUR_API_TOKEN` in `src/openapi-mcp-server.ts`
  with a real token. The model never sees credentials — they stay in the host
  request function.
- **Code Mode is experimental** and may introduce breaking changes.
