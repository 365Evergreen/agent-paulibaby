# Problem

I’ll map the current Worker, agent boundaries, and UI deployment before recommending a structure.

**Recommendation:** Separate the UI from the agent code, but keep both in one repository and initially deploy them together. Make Think the **conversation orchestrator**, with a thin Worker front door handling authentication and routing before requests reach it.

Today this is **one agent, not yet a multi-agent system**: `src/server.ts` defines `PaulibabyAgent`; `server-simple.ts` is an alternative implementation, and the two MCP servers are alternative Worker entrypoints. `wrangler.jsonc` deploys only `server.ts`. The UI connects directly to that agent and calls its approval methods.

I would organize the repository along these lines:

```text
apps/
  web/                 # React UI and browser-only tools
  gateway/             # Worker routing, authentication, Think agent
packages/
  agents/
    think/             # Orchestration and conversation state
    <specialist>/      # Add when a real specialist exists
  contracts/           # Shared request/result and approval types
  connectors/          # GitHub and other integrations
```

**Agent packages:** Give a specialist its own package when it has a distinct responsibility, contract, dependencies, or ownership—not automatically for every prompt or tool. A package is a code boundary, not a separate Worker: start with one deployment and extract a Worker only when independent scaling, permissions, releases, or failure isolation justify the operational cost. Keep specialist calls explicit and typed; Think should delegate rather than become a dependency of every specialist.

**UI separation:** Move React, browser tools, and styles into `apps/web`, while retaining same-origin hosting initially. This clarifies the browser/server boundary without immediately adding cross-origin WebSocket and authentication complexity. Define the chat and approval contract explicitly: `src/client.tsx` currently depends on the agent name and callable method names.

Before expanding the system, address these architectural risks:

- The Worker routes agent requests directly, with **no authentication or authorization visible in `src/server.ts`**. Protect chat, agent identity, and approval calls at the front door; external access controls may exist but are not shown here.
- `GithubConnector` gates only a tool named `create_issue`; other mutating tools are not gated by that code. Use least-privilege credentials and an explicit authorization/approval policy.
- Preserve the existing `PaulibabyAgent` Durable Object binding, class identity, migration history, and instance naming during restructuring, or plan a state migration. Moving a file alone should not be treated as permission to recreate state.
- The MCP examples are not exposed by the current entrypoint; deploying them alongside chat requires explicit routing or separate Workers. Store real credentials as secrets, not in configuration or source.

A practical first step is to separate UI and server directories, introduce shared contracts, and keep the existing deployment and Durable Object identity intact; add specialist packages as their actual responsibilities emerge.

## Taskss

Created a restructuring todo list in the session:

- [ ] Inventory current routes, bindings, Durable Object identities, migrations, and behavior.
- [ ] Define gateway, Think, specialist-agent, UI, and shared-package boundaries.
- [ ] Establish monorepo workspaces and shared build conventions.
- [ ] Define typed contracts for delegation, streaming, approvals, and errors.
- [ ] Separate the UI while retaining same-origin hosting initially.
- [ ] Separate the gateway and Think agent without losing existing state.
- [ ] Organize connectors and standalone MCP services; move credentials to secrets.
- [ ] Secure agent access, tenant isolation, tool permissions, and approvals.
- [ ] Establish a package and onboarding convention for each future specialist agent; deploy independently only when justified.
- [ ] Verify state preservation, chat, approvals, delegation, and deployment.
- [ ] Document architecture, agent onboarding, operations, and rollback.