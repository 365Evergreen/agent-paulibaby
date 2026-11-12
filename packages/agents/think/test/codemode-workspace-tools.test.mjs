import assert from "node:assert/strict";
import { test } from "node:test";
import { codemodeWorkspaceTools } from "../src/codemode-workspace-tools.ts";

test("adapts streaming exec output and supplies context for Code Mode", async () => {
  const exec = {
    inputSchema: {},
    async *execute(input, { toolCallId, messages }) {
      assert.deepEqual(input, { command: "test" });
      assert.match(toolCallId, /^codemode-/);
      assert.deepEqual(messages, []);
      yield { exitCode: null };
      yield { exitCode: 0, result: "done" };
    },
  };
  const tools = codemodeWorkspaceTools({ exec });
  assert.deepEqual(await tools.exec.execute({ command: "test" }), {
    exitCode: 0,
    result: "done",
  });
});

test("fails explicitly if the workspace exec stream has no result", async () => {
  const tools = codemodeWorkspaceTools({
    exec: { inputSchema: {}, async *execute() {} },
  });
  await assert.rejects(tools.exec.execute({}), /returned no result/);
  assert.throws(() => codemodeWorkspaceTools({}), /not configured/);
});
