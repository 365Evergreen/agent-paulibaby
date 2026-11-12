import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveApproval } from "../src/approval-actions.ts";

test("uses Think's approval and rejection call signatures", async () => {
  const calls = [];
  const call = async (method, args) => {
    calls.push([method, args]);
    return { status: method === "approveExecution" ? "completed" : "rejected" };
  };
  await resolveApproval(call, { action: "approve", executionId: "run" });
  await resolveApproval(call, { action: "reject", executionId: "run", seq: 2 });
  assert.deepEqual(calls, [
    ["approveExecution", ["run"]],
    ["rejectExecution", ["run"]],
  ]);
});

test("surfaces stale or invalid approval results", async () => {
  const command = { action: "approve", executionId: "run" };
  await assert.rejects(
    resolveApproval(async () => ({ status: "error", error: "No longer pending" }), command),
    /No longer pending/,
  );
  await assert.rejects(resolveApproval(async () => undefined, command), /invalid approval response/);
});
