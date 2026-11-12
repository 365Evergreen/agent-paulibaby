# Operations, verification, and rollback

This runbook covers the root `agent-paulibaby` Worker. The standalone MCP
services have separate configurations and must be assessed independently.
See [architecture](../../design/monorepo-boundaries.md),
[access and approvals](access-and-approvals.md), and
[specialist onboarding](specialist-agent-onboarding.md).

## Current verification status

The following observations were made on 2026-11-12, not a guarantee of
subsequent deployment state:

| Area | Evidence and remaining work |
| --- | --- |
| Deployment | Production version `c257e31e-febb-4b9f-a264-1ba41ccc303e` is active. The build and Wrangler dry run succeed, but these do not test runtime behavior. |
| Existing state | Production has a SQLite-backed `PaulibabyAgent` namespace following the class rename. This verifies the namespace, not the contents of any conversation. The active version has no `LEGACY_STATE_OWNER_SUBJECT` binding, so the former `default` instance is not routed to its owner. |
| Access and chat | The deployed agent route returned `503 access_not_configured`; the active version has none of the required Access variables. A local direct Think turn generated runnable code, but authenticated browser chat, streaming, and reconnect remain unverified. |
| Approvals | The local Think integration uses the SDK's synchronous runtime tool and built-in approval methods; the browser tool has a separate name. GitHub writes are blocked at discovery and invocation until approval, replay, and concurrency are verified end to end. Production has no `GITHUB_TOKEN` secret as of the observation above. |
| Browser permissions | Local tests cover approval and rejection of each protected operation. This fix is not verified in the deployed Worker until the new version is deployed and tested. |
| Delegation | Request and result schemas are tested; there is no specialist registration or delegation execution path to verify yet. |

Local typecheck and unit tests do not establish that authenticated chat,
reconnect, workspace persistence, or durable approvals work end to end. A
successful build does not imply an interactive scenario passed.

An isolated local Worker using the actual Think agent and its configured
Workers AI model generated a JavaScript palindrome function in a chat turn.
In a second turn it used the durable Code Mode workspace connector to write
and read the function, then returned its contents in chat. The resulting
function passed four local cases. The workspace was local Durable Object
storage, not a checkout on the host filesystem. This direct Think test
bypassed the gateway and browser UI and used no GitHub connector.

The local phase-zero probe exercised the actual durable Code Mode runtime and
workspace tools in an isolated test Worker: a file survived a Worker restart,
and workspace JavaScript could not use outbound `fetch`. This bypassed the
gateway and did not verify an authenticated chat or a GitHub connection.
In a separate test-only connector, a rejected action did not run, a paused
action survived a Worker restart, and duplicate or concurrent approvals did
not repeat the action. That probe exercised the runtime directly, not the
browser approval UI or an external service.
Code Mode's `ToolSetConnector` does not provide an AI SDK abort signal to
workspace `exec`; the adapter collects its final streamed result, but stopping
a chat turn has not been verified to stop an already running exec.

## Before deploying

1. Use a protected staging environment and test account where possible. Identify
   the Worker, environment, currently active version, routes, Access application,
   bindings, and secrets. Do not put secret values in source or logs. Wrangler
   configuration can overwrite dashboard-managed configuration; reconcile it
   first. `wrangler secret put` itself creates and deploys a version.
2. Record the current version and Durable Object migration history. Preserve
   `v1` (`OpenCodeAgent`) and `v2` (rename to `PaulibabyAgent`); do not delete
   classes or rewrite applied migrations. Plan and verify a restorable backup
   or [point-in-time recovery](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/#pitr-point-in-time-recovery-api)
   where applicable before state-affecting changes. Point-in-time recovery
   uses APIs on each SQLite-backed object and needs a tested recovery process;
   this repository does not currently expose an operator recovery endpoint.
3. Configure `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, and
   `CF_ACCESS_ALLOWED_GROUP_IDS` for the protected application. Set
   `LEGACY_STATE_OWNER_SUBJECT` to the verified old owner when restoring the
   `default` conversation; never infer or assign the owner from the first user.
   The group claim in the issued Access JWT must match the configured group
   IDs. Supply `GITHUB_TOKEN` as a secret only if GitHub tools are needed.
4. Run `npm test`, `npm run typecheck`, `npm run build`, and
   `npx wrangler deploy --dry-run --config wrangler.jsonc`. Fix failures before
   deployment. Dry run checks packaging, not remote migrations, security, or
   runtime behavior.
5. Deploy through the existing Workers Builds workflow or, when explicitly
   intended, run `npm run build` followed by `npm run deploy`. Confirm the
   intended account, Worker, route, and configuration first.

Useful read-only checks for the root Worker:

```powershell
npx wrangler deployments status --name agent-paulibaby
npx wrangler versions list --name agent-paulibaby
npx wrangler versions view <version-id> --name agent-paulibaby
npx wrangler secret list --config wrangler.jsonc
```

## Post-deployment verification

Use authorized test identities and a disposable test repository; never create
real GitHub mutations merely to test. Record evidence without conversation
content, access tokens, or personal identifiers.

1. Confirm the expected deployed version and namespace. Sign in as the
   designated legacy owner and compare a known existing conversation and
   workspace file with a pre-deployment record. Reload and reconnect, and
   verify a second user cannot see that state. Without the legacy owner binding,
   any old `default` state is not selected by the gateway.
2. Send a chat message; observe streaming, final response, refresh, and
   reconnect. Confirm unauthorized requests cannot access the agent.
3. Exercise a non-mutating GitHub tool and confirm GitHub mutations are blocked.
   Verify approval and rejection with a safe test-only connector, including full
   arguments, repeated/concurrent resolution, reconnect and restart. Do not
   enable external writes until replay and uncertain in-flight effects have been
   assessed against a disposable test service. Check protected browser operations
   prompt and rejection blocks access.
4. Once a specialist and delegation runtime exist, exercise successful and
   failed delegation with matching request IDs and tenant isolation. Contract
   parsing alone is not delegation verification.
5. Inspect Worker logs for authentication, connection, and execution errors.
   Keep the verification checklist open until all applicable scenarios pass.

## Rollback and recovery

Identify a known-good version with `deployments status` and `versions list`;
review its bindings and compatibility before any rollback. With explicit
authorization, `npx wrangler rollback <version-id> --name agent-paulibaby`
immediately routes production traffic to that version.

Rollback changes code, not connected resources or their data. Cloudflare
blocks rollback across Durable Object class lifecycle changes, including
renames. In particular, do not assume the pre-`v2` `OpenCodeAgent` version is
a valid rollback target after the rename. If it is blocked, prepare a
compatible forward deployment retaining the current namespace and migration
history, and separately assess data recovery. Never use `deleted_classes` to
make rollback succeed: it deletes the class's stored data. See
[Cloudflare rollback limitations](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/)
and [legacy class migrations](https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/).

After rollback or recovery, recheck Access, the selected owner, namespace,
chat, approvals, and logs. A code rollback cannot undo external GitHub actions.
