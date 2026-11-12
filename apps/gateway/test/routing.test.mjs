import assert from "node:assert/strict";
import { test } from "node:test";
import { tenantAgentRequest } from "../src/routing.ts";

test("overwrites the client-selected instance while preserving the query", () => {
  const request = new Request(
    "https://app.example.com/agents/paulibaby-agent/client-chosen?resume=last",
  );
  const routed = tenantAgentRequest(request, "user-isolated");

  assert.ok(routed);
  assert.equal(new URL(routed.url).pathname, "/agents/paulibaby-agent/user-isolated");
  assert.equal(new URL(routed.url).search, "?resume=last");
});

test("does not route other agents or nested agent paths", () => {
  assert.equal(
    tenantAgentRequest(
      new Request("https://app.example.com/agents/other-agent/default"),
      "user-isolated",
    ),
    null,
  );
  assert.equal(
    tenantAgentRequest(
      new Request("https://app.example.com/agents/paulibaby-agent/default/sub/other"),
      "user-isolated",
    ),
    null,
  );
});
