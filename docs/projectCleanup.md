# Project cleanup

The application is a workspace monorepo. The root Worker continues to serve the
React UI and `PaulibabyAgent` on the same origin. The Worker retains the
original `OpenCodeAgent` `v1` migration and adds a `v2` rename to
`PaulibabyAgent`; the root `.wrangler/state` location is unchanged.

Cloudflare Access JWT validation runs in the gateway before agent routing.
Verified issuer, audience, and subject determine an opaque per-user Durable
Object name; configure `LEGACY_STATE_OWNER_SUBJECT` to preserve the previous
`default` instance for its owner. GitHub and OpenAPI credentials are Worker
secrets. Standalone MCP services live under `apps/`, have their own Wrangler
configs, require Access, and disable `workers.dev` by default.

## Checklist

- [ ] Inventory current routes, bindings, Durable Object identities, migrations, and behavior.
- [x] Define gateway, Think, specialist-agent, UI, and shared-package boundaries.
- [x] Establish monorepo workspaces and shared build conventions.
- [x] Define typed contracts for delegation, streaming, approvals, and errors.
- [x] Separate the UI while retaining same-origin hosting initially.
- [x] Separate the gateway and Think agent without losing existing state.
- [x] Organize connectors and standalone MCP services; move credentials to secrets.
- [x] Secure agent access, tenant isolation, tool permissions, and approvals.
- [x] Establish a package and onboarding convention for each future specialist agent; deploy independently only when justified.
- [ ] Verify state preservation, chat, approvals, delegation, and deployment.
- [ ] Document architecture, agent onboarding, operations, and rollback.

See [monorepo boundaries](../design/monorepo-boundaries.md), [Access and
approvals](agents/access-and-approvals.md), and [specialist onboarding](agents/specialist-agent-onboarding.md).
