import type { ToolSet } from "ai";

export function codemodeWorkspaceTools(tools: ToolSet): ToolSet {
  const exec = tools.exec;
  const execute = exec?.execute;
  if (!exec || !execute) {
    throw new Error("The workspace exec tool is not configured.");
  }
  return {
    ...tools,
    exec: {
      ...exec,
      execute: async (input, options) => {
        // ToolSetConnector supplies no AI SDK context and cannot clone a stream.
        const output = await execute(input, options ?? {
          toolCallId: `codemode-${crypto.randomUUID()}`,
          messages: [],
          context: {},
        });
        if (output && typeof output === "object" && Symbol.asyncIterator in output) {
          let result: unknown;
          let received = false;
          for await (const value of output) {
            result = value;
            received = true;
          }
          if (!received) throw new Error("Workspace exec returned no result.");
          return result;
        }
        return output;
      },
    },
  };
}
