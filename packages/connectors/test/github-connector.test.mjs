import assert from "node:assert/strict";
import { test } from "node:test";
import { githubToolRequiresApproval } from "../src/github-approval-policy.ts";

test("requires approval for GitHub tools outside the read-only allowlist", () => {
  assert.equal(githubToolRequiresApproval("create_issue"), true);
  assert.equal(githubToolRequiresApproval("new_mutation"), true);
  assert.equal(githubToolRequiresApproval("get_file_contents"), false);
});
