# agent-paulibaby — Think top-level agent

A stateful AI chat agent built with `@cloudflare/think`, running on the same
Workers AI model as the existing `OpenCodeAgent`: **`@cf/moonshotai/kimi-k2.7-code`**
with `reasoningEffort: "low"`.

## What you get

| Feature | How |
|---|---|
| **Streaming chat** | WebSocket protocol, resumable across page refreshes |
| **Persistent memory** | Durable Object SQLite — survives evictions & restarts |
| **Workspace file tools** | `read`, `ls`, `find`, `grep`, `write`, `edit`, `delete` (built-in, no config) |
| **Code execution** | `exec` — model writes & runs JS against workspace files (via `WorkerJavaScriptBackend`) |
| **Tracing** | Model turns, tool calls, and approvals in the dashboard Agents view |

## Repo structure

```
agent-paulibaby/
├── src/
│   ├── server.ts        # PaulibabyAgent (extends Think) + fetch handler
│   └── client.tsx       # React chat UI (useAgentChat)
├── index.html           # HTML entry point for the frontend
├── vite.config.ts       # Vite + @cloudflare/vite-plugin
├── wrangler.jsonc       # Worker config: AI, LOADER, Durable Object, assets
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config (extends agents/tsconfig)
└── README.md            # This file
```

## Setup

```sh
npm install
```

## Develop locally

```sh
npm run dev
```

Vite serves the React frontend and proxies `/agents/*` to the Worker.

## Deploy

```sh
npm run deploy
```

## How the workspace tools work

Think gives every agent a `Workspace` from `@cloudflare/computer`, stored in the
Durable Object's SQLite. The file tools (`read`, `ls`, `find`, `grep`, `write`,
`edit`, `delete`) are added to every turn automatically — no configuration needed.

Adding a `WorkerJavaScriptBackend` (backed by the `LOADER` worker_loader binding)
also enables `exec`: the model can write and run JavaScript against workspace
files in a Dynamic Worker.

## Notes

- **Model**: `@cf/moonshotai/kimi-k2.7-code` — same as the existing worker. Change
  `MODEL_ID` in `src/server.ts` to switch models.
- **Migration tag**: This config uses `"v1"`. If your existing `OpenCodeAgent`
  already deployed a `"v1"` migration, bump the tag to `"v2"` before deploying.
- **Existing OpenCodeAgent**: This setup replaces the top-level agent with Think.
  To keep `OpenCodeAgent` alongside Think, add its binding back to
  `durable_objects.bindings` in `wrangler.jsonc`.
