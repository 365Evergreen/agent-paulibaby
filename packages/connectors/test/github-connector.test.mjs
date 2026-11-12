import assert from "node:assert/strict";
import { test } from "node:test";
import { assertGithubReadOnlyTool, githubToolRequiresApproval, restrictGithubConnection } from "../src/github-approval-policy.ts";

test("requires approval for GitHub tools outside the read-only allowlist", () => {
  assert.equal(githubToolRequiresApproval("create_issue"), true);
  assert.equal(githubToolRequiresApproval("new_mutation"), true);
  assert.equal(githubToolRequiresApproval("get_file_contents"), false);
  assert.doesNotThrow(() => assertGithubReadOnlyTool("get_file_contents"));
  assert.throws(() => assertGithubReadOnlyTool("create_issue"), /disabled until mutation approvals are verified/);
  assert.throws(() => assertGithubReadOnlyTool("new_mutation"), /disabled until mutation approvals are verified/);
});

test("filters and blocks unreviewed GitHub calls even when invoked directly", async () => {
  const calls = [];
  const tools = [
    { name: "get_file_contents", inputSchema: {} },
    { name: "create_issue", inputSchema: {} },
    { name: "unknown_tool", inputSchema: {} },
  ];
  const restricted = restrictGithubConnection({
    tools,
    fetchTools: async () => tools,
    client: {
      callTool: async (params) => {
        calls.push(params);
        return { structuredContent: { ok: true } };
      },
    },
  });
  assert.deepEqual(restricted.tools.map((tool) => tool.name), ["get_file_contents"]);
  assert.deepEqual((await restricted.fetchTools()).map((tool) => tool.name), ["get_file_contents"]);
  await restricted.client.callTool({ name: "get_file_contents", arguments: { path: "README.md" } });
  assert.throws(() => restricted.client.callTool({ name: "create_issue" }), /disabled/);
  assert.throws(() => restricted.client.callTool({ name: "unknown_tool" }), /disabled/);
  assert.deepEqual(calls, [{ name: "get_file_contents", arguments: { path: "README.md" } }]);
});
