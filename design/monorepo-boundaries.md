# Monorepo boundaries and build conventions

This document defines code ownership and dependency rules for the repository.
The UI, gateway, Think agent, shared contracts, authentication helper, GitHub
connector, and standalone MCP services now live in their respective workspaces.

## Code boundaries

| Area | Target location | Owns | Must not own |
| --- | --- | --- | --- |
| Gateway | `apps/gateway` | Worker entry point, HTTP/WebSocket routing, authentication and authorization hooks, request validation, same-origin asset serving, and mapping errors to transport responses | Prompts, model policy, specialist logic, or UI components |
| Think | `packages/agents/think` | Conversation lifecycle, model configuration, orchestration, tool selection, and delegation to specialists | HTTP edge policy, browser rendering, or specialist-specific implementation |
| Specialist agents | `packages/agents/<name>` | One focused capability with a typed input/output contract, its own instructions, and the tools needed for that capability | Gateway/UI imports, credentials, or direct dependencies on other specialists |
| UI | `apps/web` | React rendering, browser state, browser-only tools, and chat/approval interaction | Server secrets, server tool implementations, or imports from agent runtime packages |
| Shared contracts | `packages/contracts` | Versioned schemas and types shared across runtime and UI boundaries, including delegation, chat, approval, and error shapes | Environment-specific code, model prompts, or infrastructure bindings |
| Shared connectors | `packages/connectors` | Reusable adapters for external tools and services, with credentials supplied by the consuming runtime | Credential storage, UI behavior, or agent orchestration |
| Shared authentication | `packages/auth` | Cloudflare Access JWT verification, group authorization, and opaque per-principal agent names | App-specific routes, UI/session storage, or credential issuance |
| Standalone MCP services | `apps/mcp-*` | Independently configured MCP endpoints, each with explicit Access and Origin checks | Gateway Durable Object state or credentials embedded in Worker config |

Think is the intended conversation orchestrator, not a dependency that specialists import.
Delegation contracts exist, but specialist registration and execution are not
implemented yet. A specialist
is a code package by default, not a separate Worker deployment; split its
deployment only when independent security, scaling, release, or failure-isolation
needs justify the operational cost.

The intended dependency direction is:

```text
apps/web ───────────────> packages/contracts
apps/gateway ───────────> packages/auth, packages/contracts, packages/agents/think
apps/mcp-* ─────────────> packages/auth
packages/agents/think ──> packages/contracts, packages/connectors
packages/agents/<name> ─> packages/contracts, packages/connectors
```

Packages must not create circular dependencies. Cross-boundary imports use
workspace package names and public exports, not relative paths into another
package's source tree. The browser and Worker communicate through the shared
protocol, not by importing each other's implementation.

## Workspace and build conventions

- The repository root is the sole npm and lockfile root. Run `npm install` from
  the root; do not add package-local lockfiles.
- npm workspaces are reserved for `apps/*`, `packages/*`, and
  `packages/agents/*`. A workspace manifest is added with each extracted
  package; do not create empty placeholder packages just to populate the globs.
- Internal packages use the `@agent-paulibaby/` name prefix and expose only
  supported entry points through `exports`. Keep internal packages private
  until publishing is an explicit requirement.
- The root `package.json` remains the compatibility entry point during
  extraction. Preserve `npm run dev`, `npm run build`, `npm run deploy`, and
  `npm run typecheck`; each workspace that implements those capabilities uses
  the same script names. Root commands can then fan out with npm's workspace
  flags once child workspace manifests exist.
- TypeScript packages extend the root `tsconfig.base.json` and may add
  platform-specific compiler options locally. The base preserves the existing
  Agents SDK TypeScript defaults, strict checking, JSX mode, and Worker types.
- Keep source as ESM (`"type": "module"`). App packages own their bundler and
  deployment configuration; shared libraries should typecheck/build without
  depending on an app's Vite or Wrangler configuration.
- Changes that move the existing Worker entry point must preserve its Wrangler
  Durable Object class identity, binding name, and migration history. Package
  extraction alone is not a state migration.

## Shared contracts

`packages/contracts` exports runtime Zod schemas and inferred TypeScript types:

- Delegation requests carry a request ID, specialist ID, optional conversation
  ID, and JSON input. Results are a discriminated `completed`/`failed` union.
- Chat stream events are application-level `text_delta`, `completed`, and
  `error` events with a request ID and monotonically increasing sequence
  number. They describe the domain event contract and do not replace the
  Agents SDK WebSocket wire protocol.
- Pending approvals use the Code Mode runtime's `executionId`, `seq`,
  `connector`, `method`, and JSON `args` fields. Approval commands are typed
  approve/reject intents and map to the existing callable methods.
- API and stream errors use a stable `code`, human-readable `message`,
  `retryable` flag, and optional JSON details.

The UI validates approval data at runtime before rendering it. The gateway uses
the shared error response type for its JSON not-found response.

## Access, tenants, and tool permissions

The gateway verifies Cloudflare Access assertions (issuer, audience, expiry,
signature, and an allowed group) before routing any agent request. It derives
the Durable Object instance name from the verified issuer, audience, and
subject; a client-supplied instance name is never used for identity. Set
`LEGACY_STATE_OWNER_SUBJECT` to keep the verified owner of the previous
`default` instance on that existing state. Do not assign legacy state to the
first caller automatically.

GitHub is connected at runtime with the `GITHUB_TOKEN` Worker secret, not the
MCP manager or Durable Object storage. Read-only GitHub tools use an explicit
allowlist; all other and future tools are intended to require durable approval.
The durable approval integration is not yet verified against the installed SDK.
Local browser tools ask for confirmation before clipboard, geolocation, and
localStorage access.
Standalone MCP endpoints use the same Access validation and reject unapproved
browser Origins. See [Access and approvals](../docs/agents/access-and-approvals.md)
for configuration and operations.

## Current transition state

The web UI, gateway entry point, Think agent, GitHub connector, contracts, auth
helper, and standalone MCP services live in npm workspaces. Vite still builds
and serves the web assets and Worker together on the same origin. Chat and
approvals still require end-to-end verification. The root `wrangler.jsonc` keeps its Worker name and
`PaulibabyAgent` export/binding. The original `v1` created `OpenCodeAgent`,
and `v2` renames it to `PaulibabyAgent`; Vite's local persistence path remains
anchored to the existing root `.wrangler/state` directory. Standalone MCP
services have separate Wrangler configs and `workers_dev` disabled by default.
