import type { ApprovalCommand } from "@agent-paulibaby/contracts";

export async function resolveApproval(
  call: (method: string, args: unknown[]) => Promise<unknown>,
  command: ApprovalCommand,
): Promise<void> {
  const method = command.action === "approve" ? "approveExecution" : "rejectExecution";
  const result = await call(method, [command.executionId]);
  if (typeof result !== "object" || result === null || !("status" in result)) {
    throw new Error("The agent returned an invalid approval response.");
  }
  if (result.status === "error") {
    throw new Error("error" in result && typeof result.error === "string"
      ? result.error
      : "Approval failed.");
  }
  if (result.status !== "completed" && result.status !== "paused" && result.status !== "rejected") {
    throw new Error("The agent returned an invalid approval response.");
  }
}
