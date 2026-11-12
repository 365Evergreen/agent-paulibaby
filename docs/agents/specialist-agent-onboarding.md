# Specialist agent package and onboarding convention

## Default package boundary

Create a specialist as `packages/agents/<slug>` when it has a distinct domain
responsibility, input/output contract, tool permissions, dependencies, or owner.
The slug is lowercase kebab-case and is also the delegation `specialistId`.
Do not create a package for a prompt variation or every individual tool.

Each package should:

1. Use the `@agent-paulibaby/<slug>` workspace name, ESM, and the root
   `tsconfig.base.json`.
2. Export a small public entry point from `src/index.ts`; keep implementation
   details private.
3. Define and validate its delegation input and result with schemas in
   `packages/contracts`, then implement the typed contract.
4. Declare only the tools and connectors it needs. Keep external credentials in
   Worker secrets supplied by the runtime, never in the package or its Durable
   Object state.
5. Add focused tests for its contract, permission rules, and error behavior.
6. Document its owner, capabilities, required bindings/secrets, and local test
   command in the package README or the relevant agent operations guide.

Specialists must not import Think, the gateway, the UI, or another specialist.
Think owns conversation state and delegation policy; the gateway owns
authentication, tenant routing, and the Worker entry point. The gateway or
Think should compose specialists through typed contracts. The current
repository has contracts but no specialist registration or delegation runtime;
implement and test that path when introducing the first specialist.

## Registration and state

Start with specialist code in the existing deployment. Add a Durable Object
binding only when the specialist needs independent durable state. Preserve any
existing class name, binding name, and migration history; changing a source
path does not require changing those identities. Add migrations only for
intentional schema changes.

Use the shared `packages/auth` and `packages/connectors` packages where
appropriate. Unknown or mutating connector tools must be blocked until their
approval and replay behavior is verified end to end; GitHub writes are
currently disabled. Add the contract to the relevant tests and document the
failure/error shape.

## Independent deployment gate

Give a specialist its own `apps/<name>` Worker and Wrangler config only when at
least one operational need justifies it:

- independent credentials or access policy;
- materially different scaling or resource limits;
- independent release cadence or team ownership; or
- failure isolation that the shared Worker cannot provide.

Otherwise keep it as a package in the root Worker. Independent Workers must
have their own package scripts, bindings, secret/config inventory, authentication
and Origin policy (for MCP), deployment instructions, and rollback instructions.
Do not enable a public `workers.dev` endpoint by default.
