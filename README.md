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
├── src/
│   ├── server.ts                  # Think agent: durable runtime (recommended)
│   ├── server-simple.ts           # Think agent: stateless runtime
│   ├── mcp-server.ts              # Code Mode MCP server (wraps upstream MCP)
│   ├── openapi-mcp-server.ts      # Code Mode MCP server (from OpenAPI spec)
│   ├── client.tsx                 # React chat UI + browser Code Mode + approvals
│   ├── client.module.css          # CSS module (no inline styles)
│   ├── codemode-tool.ts           # Browser Code Mode descriptor (IframeSandboxExecutor)
│   ├── browser-tools.ts           # Browser-owned tools (timezone, clipboard, geolocation, localStorage)
│   └── connectors/
│       └── github-connector.ts    # MCP connector with approval gating
├── index.html                     # HTML entry point
├── vite.config.ts                # Vite + @cloudflare/vite-plugin
├── wrangler.jsonc                 # AI, LOADER, Durable Object, assets, MCP config
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
└── README.md                      # This file
```

## Four Code Mode surfaces

### 1. Server Code Mode — durable runtime (`src/server.ts`)

`createCodemodeRuntime()` with `DynamicWorkerExecutor`. The model writes one JS
function that calls `workspace.*`, `github.*`, and `operations.*` methods.
Execution history, approvals, rollback, and snippets are stored in SQLite.

### 2. Server Code Mode — stateless (`src/server-simple.ts`)

`createCodeTool()` — same orchestration, no durable state. Includes MCP tools
via `this.mcp.getAITools()`.

### 3. Browser Code Mode (`src/codemode-tool.ts` + `src/client.tsx`)

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

### MCP connector (`src/connectors/github-connector.ts`)

Wraps a GitHub MCP server. All tools become `github.*` methods. The
`create_issue` tool is marked `requiresApproval: true` — the runtime pauses
before executing it and returns a pending approval to the client.

### ToolSetConnector (in `src/server.ts`)

Exposes AI SDK tools as `operations.*`. The model calls
`operations.getServerTime()`, `operations.echo()`, etc. from generated code.

## Human-in-the-loop approvals

The durable runtime (`src/server.ts`) exposes three `@callable` methods:

- `pendingApprovals()` — list paused executions waiting for review
- `approveExecution(executionId)` — approve and resume
- `rejectExecution(executionId, seq)` — reject and stop

The client (`src/client.tsx`) polls `pendingApprovals()` every 2 seconds and
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

## Switching server variants

In `wrangler.jsonc`, set `"main"` to:

- `src/server.ts` — Think agent with durable Code Mode runtime
- `src/server-simple.ts` — Think agent with stateless Code Mode
- `src/mcp-server.ts` — standalone Code Mode MCP server (wraps upstream MCP)
- `src/openapi-mcp-server.ts` — standalone Code Mode MCP server (from OpenAPI)

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
