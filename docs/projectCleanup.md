# Problem

I’ll map the current Worker, agent boundaries, and UI deployment before recommending a structure.

**Recommendation:** Separate the UI from the agent code, but keep both in one repository and initially deploy them together. Make Think the **conversation orchestrator**, with a thin Worker front door handling authentication and routing before requests reach it.

The first extraction phase now reflects that structure: `packages/agents/think/src/agent.ts` defines the existing `PaulibabyAgent`, `apps/gateway/src/index.ts` is the Worker front door, and `apps/web` contains the same-origin UI. This is still **one agent, not yet a multi-agent system**. The stateless Think variant remains available, and the two MCP servers remain standalone examples. The UI continues to call the durable agent's approval methods.

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

**UI separation:** React, browser tools, and styles now live in `apps/web`, while the Vite/Cloudflare integration keeps same-origin hosting. The shared contracts describe delegation, stream events, approvals, and errors without replacing the Agents SDK WebSocket wire protocol.

Before expanding the system, address these architectural risks:

- The Worker routes agent requests directly, with **no authentication or authorization visible in `apps/gateway/src/index.ts`**. Protect chat, agent identity, and approval calls at the front door; external access controls may exist but are not shown here.
- `GithubConnector` gates only a tool named `create_issue`; other mutating tools are not gated by that code. Use least-privilege credentials and an explicit authorization/approval policy.
- Preserve the existing `PaulibabyAgent` Durable Object binding, class identity, migration history, and instance naming during restructuring, or plan a state migration. Moving a file alone should not be treated as permission to recreate state.
- The MCP examples are not exposed by the current entrypoint; deploying them alongside chat requires explicit routing or separate Workers. Store real credentials as secrets, not in configuration or source.

A practical next step is to secure the gateway and define authorization for tool execution; add specialist packages as their actual responsibilities emerge.

## Taskss

Progress on the restructuring tasks:

- [ ] Inventory current routes, bindings, Durable Object identities, migrations, and behavior.
- [x] Define gateway, Think, specialist-agent, UI, and shared-package boundaries.
- [x] Establish monorepo workspaces and shared build conventions.
- [x] Define typed contracts for delegation, streaming, approvals, and errors.
- [x] Separate the UI while retaining same-origin hosting initially.
- [x] Separate the gateway and Think agent without losing existing state.
- [ ] Organize connectors and standalone MCP services; move credentials to secrets.
- [ ] Secure agent access, tenant isolation, tool permissions, and approvals.
- [ ] Establish a package and onboarding convention for each future specialist agent; deploy independently only when justified.
- [ ] Verify state preservation, chat, approvals, delegation, and deployment.
- [ ] Document architecture, agent onboarding, operations, and rollback.