// @ts-ignore @types/react-dom is not installed.
import { createRoot } from "react-dom/client";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";

function Chat() {
  const agent = useAgent({ agent: "PaulibabyAgent" });
  const { messages, sendMessage, status } = useAgentChat({ agent });

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1>agent-paulibaby</h1>
      <p style={{ color: "#666" }}>
        Think agent · @cf/moonshotai/kimi-k2.7-code · workspace file tools
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg: {
          id: string;
          role: string;
          parts: { type: string; text?: string }[];
        }) => (
          <div
            key={msg.id}
            style={{
              textAlign: msg.role === "user" ? "right" : "left",
            }}
          >
            <strong>{msg.role}: </strong>
            {msg.parts.map((part: { type: string; text?: string }, i) =>
              part.type === "text" ? <span key={i}>{part.text}</span> : null,
            )}
          </div>
        ))}
      </div>

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
        style={{ marginTop: 16, display: "flex", gap: 8 }}
      >
        <input
          name="input"
          placeholder="Send a message..."
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit">Send</button>
      </form>

      <p style={{ color: "#999", marginTop: 8 }}>Status: {status}</p>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<Chat />);
}
