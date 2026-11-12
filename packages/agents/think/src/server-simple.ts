import { Think } from "@cloudflare/think";
import { Workspace } from "@cloudflare/computer";
import { WorkerJavaScriptBackend } from "@cloudflare/computer/backends/worker-javascript";
import { createAITools } from "@cloudflare/computer/tools/ai-sdk";
import { createCodeTool } from "@cloudflare/codemode/ai";
import { DynamicWorkerExecutor } from "@cloudflare/codemode";
import { createAI } from "agents/models/ai-sdk";
import { routeAgentRequest } from "agents";

// Same model the existing OpenCodeAgent uses.
const MODEL_ID = "@cf/moonshotai/kimi-k2.7-code";

/**
 * Stateless variant: uses createCodeTool() (no durable state).
 *
 * Includes workspace tools and MCP tools (via this.mcp.getAITools()).
 * No execution history, approvals, or rollback — for that, use server.ts.
 *
 * Browser Code Mode runs entirely client-side — see apps/web/src/codemode-tool.ts.
 */
export class PaulibabyAgent extends Think<Env> {
  override workspace = new Workspace({
    storage: this.ctx.storage,
    backends: [
      new WorkerJavaScriptBackend({
        id: "js",
        loader: this.env.LOADER,
        access: "read-write",
      }),
    ],
  });

  getModel() {
    return createAI({ binding: this.env.AI })(MODEL_ID, { reasoningEffort: "low" });
  }

  getSystemPrompt() {
    return [
      "You are a helpful assistant with workspace file tools and Code Mode.",
      "Workspace tools: read, ls, find, grep, write, edit, delete, exec.",
      "Code Mode: write one JS function that orchestrates multiple tools in a single block.",
    ].join(" ");
  }

  async getTools() {
    // Wait for MCP connections so getAITools() returns the full catalog.
    await this.mcp.waitForConnections();

    const executor = new DynamicWorkerExecutor({ loader: this.env.LOADER });
    return {
      codemode: createCodeTool({
        tools: [
          // Workspace file tools as workspace.*
          { name: "workspace", tools: createAITools({ workspace: this.workspace }) },
          // MCP server tools as codemode.* (default namespace)
          ...(this.mcp.getAITools() ? [{ tools: this.mcp.getAITools() }] : []),
        ],
        executor,
      }),
    };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return (
      (await routeAgentRequest(request, env)) ||
      new Response("Not found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
