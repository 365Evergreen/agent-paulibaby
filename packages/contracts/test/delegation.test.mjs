import assert from "node:assert/strict";
import { test } from "node:test";
import { delegationRequestSchema, delegationResultSchema } from "../src/index.ts";

test("validates delegation requests and completed or failed results", () => {
  const request = {
    requestId: "request-1",
    specialistId: "research-agent",
    conversationId: "conversation-1",
    input: { query: "example" },
  };
  assert.deepEqual(delegationRequestSchema.parse(request), request);
  assert.equal(delegationRequestSchema.safeParse({ ...request, specialistId: "../other" }).success, false);
  assert.equal(delegationRequestSchema.safeParse({ ...request, input: Infinity }).success, false);
  assert.equal(delegationResultSchema.safeParse({ requestId: "request-1", status: "completed", output: { answer: 42 } }).success, true);
  assert.equal(delegationResultSchema.safeParse({
    requestId: "request-1",
    status: "failed",
    error: { code: "unavailable", message: "Unavailable", retryable: true },
  }).success, true);
  assert.equal(delegationResultSchema.safeParse({ requestId: "request-1", status: "failed" }).success, false);
});
