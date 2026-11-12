# Access, secrets, and approvals

## Gateway access

The gateway accepts requests only when `Cf-Access-Jwt-Assertion` contains a
valid Cloudflare Access JWT. Verification checks the configured team issuer,
application audience, signature, expiry, subject, and at least one configured
Access group ID. Missing configuration fails closed with `503`; missing or
invalid identity is `401`; an authenticated identity outside the allowed
groups is `403`.

Configure these non-secret Worker variables for the gateway:

| Variable | Value |
| --- | --- |
| `CF_ACCESS_TEAM_DOMAIN` | The Access team hostname, such as `team-name.cloudflareaccess.com` |
| `CF_ACCESS_AUD` | The audience tag for this Access application |
| `CF_ACCESS_ALLOWED_GROUP_IDS` | Comma-separated Access group IDs permitted to use the agent |
| `LEGACY_STATE_OWNER_SUBJECT` | Optional verified JWT `sub` that owns the existing `default` Durable Object state |

Set them in the Worker environment or locally in the root `.dev.vars` file.
Never commit `.dev.vars`. Configure the Cloudflare Access application policy
with the same allowed groups; the gateway independently checks the JWT group
claim as defense in depth.

Agent names in incoming URLs are ignored for tenant identity. The gateway hashes
the verified issuer, audience, and subject into an opaque Durable Object name.
For continuity, configure `LEGACY_STATE_OWNER_SUBJECT` with the verified
subject that owns the old shared `default` instance before deploying this
change. Only that subject continues to the old `default` instance; other users
receive separate Durable Objects. If no owner is configured, the old state is
left intact but is not routed to any user.

## Connector credentials

Set the GitHub token as a Worker secret; do not put it in `wrangler.jsonc`,
application source, or MCP manager configuration:

```powershell
npx wrangler secret put GITHUB_TOKEN --config wrangler.jsonc
```

The connector opens its MCP connection at runtime and keeps the token in
memory. It is not written to Durable Object SQLite. The token is shared by
authorized users, so grant it only the repository scopes and repositories the
agent needs. Use per-user OAuth instead if GitHub actions must execute as each
user rather than as the configured integration identity. Without the secret,
chat remains available and GitHub tools are disabled with a Worker log warning.

The OpenAPI MCP service reads `API_TOKEN` from a Worker secret and
`API_BASE_URL` from a non-secret environment variable. The base URL must be an
HTTPS origin; requests are restricted to `GET` paths declared by its OpenAPI
specification. Keep the token and URL out of tool arguments and source.

```powershell
npx wrangler secret put API_TOKEN --config apps/mcp-openapi-server/wrangler.jsonc
```

For local development, create `.dev.vars` beside the relevant Wrangler config.
The OpenAPI service also requires `CF_ACCESS_TEAM_DOMAIN`, its own
`CF_ACCESS_AUD`, `CF_ACCESS_ALLOWED_GROUP_IDS`, `MCP_ALLOWED_ORIGINS`, and
`API_BASE_URL`.

## Tool permission policy

The policies below describe the local implementation. Authenticated chat and
durable approvals still require end-to-end verification; changes are not live
until deployed. See [operations and rollback](operations-and-rollback.md).

| Tool surface | Default policy |
| --- | --- |
| GitHub MCP | Only the explicit read-only allowlist is exposed. All other tools are blocked at discovery and invocation, including previously paused calls, until durable approvals are verified. |
| Browser clipboard, geolocation, and localStorage | The browser prompts before each read or write. |
| Workspace tools | Operate within the authenticated user's isolated Durable Object workspace. |
| `operations.*` | Limited to the current server-time and echo utilities. |

Think's `pendingExecutions()` returns the full arguments of pending Code Mode
actions; its `approveExecution()` and `rejectExecution()` callables resolve
them and update the conversation. Review the connector, method, and arguments
before approving. GitHub mutations remain blocked even if an old pending run
is approved. Do not expose approval routes outside the Access-protected gateway.
The SDK approves by execution ID rather than action sequence, so concurrent
review and replay behavior must be verified before enabling external writes.

## Standalone MCP services

The Code Mode and OpenAPI MCP services have separate app packages and Wrangler
configs. Both set `workers_dev` to `false`; add a custom route or domain only
after protecting it with Cloudflare Access. They require a valid Access JWT and
reject browser `Origin` headers unless the exact origin appears in the
comma-separated `MCP_ALLOWED_ORIGINS` variable. Non-browser MCP clients may
omit `Origin` but still need Access authentication.

The current Code Mode MCP API produces MCP SDK v1 servers, so the Workers use
the Agents SDK's explicit legacy compatibility handler with stateless transport
configuration. Migrate to the factory-based SDK v2 handler when Code Mode
supports that server API.

Deploy these services independently only when a consumer needs an MCP endpoint
and the separate access, release, or scaling boundary is justified. The root
chat Worker continues to serve the UI and Think agent on the same origin.
