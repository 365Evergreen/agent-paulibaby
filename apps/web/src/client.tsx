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
import { AlertMessage } from "./components/AlertMessage/AlertMessage";
import { ApprovalPanel } from "./components/ApprovalPanel/ApprovalPanel";
import { ChatHeader } from "./components/ChatHeader/ChatHeader";
import { ChatShell } from "./components/ChatShell/ChatShell";
import { MessageComposer } from "./components/MessageComposer/MessageComposer";
import { MessageList } from "./components/MessageList/MessageList";
import "./styles/tokens.css";

function Chat() {
  const agent = useAgent({ agent: "PaulibabyAgent" });
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Register the browser Code Mode tool as a dynamic client tool.
  const tools = useMemo<Record<string, AITool>>(
    () => ({
      codemode: {
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
        const pending = await agent.call("pendingApprovals");
        setPendingApprovals(pendingApprovalsSchema.parse(pending));
        setApprovalError(null);
      } catch (error) {
        setApprovalError(error instanceof Error ? error.message : String(error));
      }
    };
    const interval = setInterval(checkApprovals, 2000);
    return () => clearInterval(interval);
  }, [agent]);

  const handleApproval = async (command: ApprovalCommand) => {
    try {
      if (command.action === "approve") {
        await agent.call("approveExecution", [command.executionId]);
      } else {
        await agent.call("rejectExecution", [command.executionId, command.seq]);
      }
      setApprovalError(null);
    } catch (error) {
      setApprovalError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <ChatShell>
      <ChatHeader status={status} />
      <MessageList messages={messages} />
      <ApprovalPanel
        approvals={pendingApprovals}
        onApprove={(approval) =>
          handleApproval({
            action: "approve",
            executionId: approval.executionId,
          })
        }
        onReject={(approval) =>
          handleApproval({
            action: "reject",
            executionId: approval.executionId,
            seq: approval.seq,
          })
        }
      />
      {approvalError && (
        <AlertMessage>Approval error: {approvalError}</AlertMessage>
      )}
      <MessageComposer
        onSendMessage={(text) => {
          sendMessage({ text });
        }}
      />
    </ChatShell>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<Chat />);
}
