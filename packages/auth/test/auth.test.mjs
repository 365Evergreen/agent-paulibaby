import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
} from "jose";
import {
  agentInstanceNameFor,
  authenticateAccessRequest,
  isAllowedOrigin,
} from "../src/index.ts";

const issuer = "https://example.cloudflareaccess.com";
const audience = "test-audience";
const allowedGroup = "group-allowed";
const environment = {
  CF_ACCESS_TEAM_DOMAIN: "example.cloudflareaccess.com",
  CF_ACCESS_AUD: audience,
  CF_ACCESS_ALLOWED_GROUP_IDS: allowedGroup,
};

const { privateKey, publicKey } = await generateKeyPair("RS256");
const jwks = createLocalJWKSet({
  keys: [{ ...(await exportJWK(publicKey)), kid: "access-key", alg: "RS256" }],
});

async function requestFor(subject, claims = {}) {
  const token = await new SignJWT({ groups: [allowedGroup], ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "access-key" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  return new Request("https://app.example.com/agents/paulibaby-agent/default", {
    headers: { "cf-access-jwt-assertion": token },
  });
}

test("accepts a signed assertion only for the configured audience and group", async () => {
  const result = await authenticateAccessRequest(
    await requestFor("subject-a"),
    environment,
    () => jwks,
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.principal, {
      issuer,
      audience,
      subject: "subject-a",
    });
  }
});

test("fails closed when Access configuration is missing", async () => {
  const result = await authenticateAccessRequest(await requestFor("subject-a"), {});
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 503);
    assert.equal(result.code, "access_not_configured");
  }
});

test("rejects identities outside the configured group", async () => {
  const result = await authenticateAccessRequest(
    await requestFor("subject-a", { groups: ["other-group"] }),
    environment,
    () => jwks,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 403);
});

test("rejects a token signed for a different audience", async () => {
  const token = await new SignJWT({ groups: [allowedGroup] })
    .setProtectedHeader({ alg: "RS256", kid: "access-key" })
    .setIssuer(issuer)
    .setAudience("another-audience")
    .setSubject("subject-a")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
  const result = await authenticateAccessRequest(
    new Request("https://app.example.com/agents/paulibaby-agent/default", {
      headers: { "cf-access-jwt-assertion": token },
    }),
    environment,
    () => jwks,
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 401);
});

test("assigns stable, distinct instance names to authenticated identities", async () => {
  const first = { issuer, audience, subject: "subject-a" };
  assert.equal(await agentInstanceNameFor(first), await agentInstanceNameFor(first));
  assert.equal(await agentInstanceNameFor(first, "subject-a"), "default");
  assert.notEqual(
    await agentInstanceNameFor(first),
    await agentInstanceNameFor({ ...first, subject: "subject-b" }),
  );
});

test("rejects browser MCP origins that are not explicitly allowed", () => {
  const request = new Request("https://mcp.example.com/mcp", {
    headers: { origin: "https://untrusted.example" },
  });
  assert.equal(isAllowedOrigin(request, "https://app.example.com"), false);
  assert.equal(
    isAllowedOrigin(request, "https://app.example.com,https://untrusted.example"),
    true,
  );
});
