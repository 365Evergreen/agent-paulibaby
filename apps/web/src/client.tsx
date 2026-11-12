'use client';
import { createRoot } from "react-dom/client";
import { useAgent } from "agents/react";
import { useAgentChat, type AITool } from "@cloudflare/ai-chat/react";
import { useMemo, useState, useEffect } from "react";
import {
  pendingApprovalsSchema,
  type ApprovalCommand,
  type PendingApproval,
} from "@agent-paulibaby/contracts";
import { codemodeTool } from "./codemode-tool";
import { resolveApproval } from "./approval-actions";
import styles from "./client.module.css";

function Chat() {
  const agent = useAgent({ agent: "PaulibabyAgent" });
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [approvalPollError, setApprovalPollError] = useState<string | null>(null);

  // Register the browser Code Mode tool as a dynamic client tool.
  const tools = useMemo<Record<string, AITool>>(
    () => ({
      browser_codemode: {
        description: codemodeTool.description,
        parameters: codemodeTool.inputSchema,
        execute: (input) =>
          codemodeTool.execute(input as { code: string }),
      },
    }),
    [],
  );

  const { messages, sendMessage, status } = useAgentChat({
    agent,
    tools,
    onToolCall: async ({ toolCall, addToolOutput }) => {
      const tool = tools[toolCall.toolName];
      if (!tool?.execute) return;
      try {
        const output = await tool.execute(toolCall.input);
        addToolOutput({
          toolCallId: toolCall.toolCallId,
          output,
        });
      } catch (error) {
        addToolOutput({
          toolCallId: toolCall.toolCallId,
          state: "output-error",
          errorText: error instanceof Error ? error.message : String(error),
        });
      }
    },
  });

  // Poll for pending Code Mode approvals (durable runtime only).
  useEffect(() => {
    const checkApprovals = async () => {
      try {
        const pending = await agent.call("pendingExecutions");
        setPendingApprovals(pendingApprovalsSchema.parse(pending));
        setApprovalPollError(null);
      } catch (error) {
        setApprovalPollError(error instanceof Error ? error.message : String(error));
      }
    };
    void checkApprovals();
    const interval = setInterval(checkApprovals, 2000);
    return () => clearInterval(interval);
  }, [agent]);

  const handleApproval = async (command: ApprovalCommand) => {
    try {
      await resolveApproval((method, args) => agent.call(method, args), command);
      setApprovalError(null);
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Paulibaby</h1>

      <div className={styles.chatContainer}>
        {messages.map(
          (msg: {
            id: string;
            role: string;
            parts: { type: string; text?: string }[];
          }) => (
            <div key={msg.id} className={styles.message}>
              <strong>{msg.role}: </strong>
              {msg.parts.map((part, i) =>
                part.type === "text" ? <span key={i}>{part.text}</span> : null,
              )}
            </div>
          ),
        )}
      </div>

      {pendingApprovals.length > 0 && (
        <div className={styles.approvalsContainer}>
          <h3 className={styles.approvalsTitle}>Pending Approvals</h3>
          {pendingApprovals.map((approval) => (
            <div key={`${approval.executionId}:${approval.seq}`} className={styles.approvalItem}>
              <span className={styles.approvalText}>
                {approval.connector}.{approval.method}
              </span>
              <details className={styles.approvalDetails}>
                <summary>Review arguments</summary>
                <pre className={styles.approvalArguments}>
                  {JSON.stringify(approval.args, null, 2)}
                </pre>
              </details>
              <div className={styles.approvalButtons}>
                <button
                  className={styles.approveButton}
                  onClick={() =>
                    handleApproval({
                      action: "approve",
                      executionId: approval.executionId,
                    })
                  }
                >
                  Approve
                </button>
                <button
                  className={styles.rejectButton}
                  onClick={() =>
                    handleApproval({
                      action: "reject",
                      executionId: approval.executionId,
                      seq: approval.seq,
                    })
                  }
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {approvalError && (
        <p className={styles.statusText} role="alert">
          Approval error: {approvalError}
        </p>
      )}
      {approvalPollError && (
        <p className={styles.statusText} role="alert">
          Approval refresh error: {approvalPollError}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem(
            "input",
          ) as HTMLInputElement;
          if (!input.value.trim()) return;
          sendMessage({ text: input.value });
          input.value = "";
        }}
        className={styles.chatBox}
      >
        <input
          name="input"
          placeholder="Send a message..."
          className={styles.chatInput}
        />
        <button type="submit" className={styles.sendButton}>
          Send
        </button>
      </form>

      <p className={styles.statusText}>Status: {status}</p>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<Chat />);
}
