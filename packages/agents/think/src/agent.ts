import { Think, type ThinkModel } from "@cloudflare/think";
import { createExecuteRuntime, type ExecuteRuntime } from "@cloudflare/think/tools/execute";
import { Workspace } from "@cloudflare/computer";
import { WorkerJavaScriptBackend } from "@cloudflare/computer/backends/worker-javascript";
import { createAITools } from "@cloudflare/computer/tools/ai-sdk";
import { toolSetConnector } from "@cloudflare/codemode/ai";
import { createAI } from "agents/models/ai-sdk";
import { routeAgentRequest } from "agents";
import { tool } from "ai";
import { z } from "zod";
import { GithubConnector } from "@agent-paulibaby/connectors";
import { workspaceLoader } from "./workspace-loader";
import { codemodeWorkspaceTools } from "./codemode-workspace-tools";

// Same model the existing OpenCodeAgent uses.
const MODEL_ID = "@cf/moonshotai/kimi-k2.7-code";

// Required: the durable Code Mode runtime stores execution history, pending
// approvals, and snippets in a Durable Object facet.
export { CodemodeRuntime } from "@cloudflare/codemode";

// ── Example AI SDK tools exposed via a ToolSetConnector ──────────────────────
// The model calls these as `operations.*` inside generated code.

const operationsTools = {
  getServerTime: tool({
    description: "Get the current server time in ISO format",
    inputSchema: z.object({}),
    execute: async () => ({ time: new Date().toISOString() }),
  }),
  echo: tool({
    description: "Echo back the provided text",
    inputSchema: z.object({ text: z.string().describe("Echo the provided text") }),
    execute: async ({ text }: { text: string }) => ({ echoed: text }),
  }),
};

/**
 * Top-level Think agent with:
 *   - Workspace file tools (read, ls, find, grep, write, edit, delete, exec)
 *   - Durable Code Mode runtime (execution history, approvals, rollback)
 *   - Read-only GitHub MCP connector
 *   - ToolSetConnector (custom AI SDK tools as operations.*)
 *
 * Browser Code Mode runs entirely client-side — see apps/web/src/codemode-tool.ts.
 */
export class PaulibabyAgent extends Think<Env> {
  override workspace = new Workspace({
    storage: this.ctx.storage,
    backends: [
      new WorkerJavaScriptBackend({
        id: "js",
        loader: workspaceLoader(this.env.LOADER),
        access: "read-write",
        egress: { mode: "none" },
      }),
    ],
  });

  // MCP tools are exposed through the Code Mode connector, not Think's
  // automatic tool set.
  includeMcpTools = false;

  getModel(): ThinkModel {
    return createAI({ binding: this.env.AI })(MODEL_ID, { reasoningEffort: "low" });
  }

  getSystemPrompt() {
    return [
      "You are a helpful assistant with workspace file tools, Code Mode, and connectors.",
      "Workspace tools: read, ls, find, grep, write, edit, delete, exec.",
      "Code Mode: write one JS function that orchestrates multiple tools in a single block.",
      "GitHub tools require the GITHUB_TOKEN Worker secret; only explicitly allowed read-only tools are available. GitHub mutations are disabled.",
      "Connectors: workspace.* (workspace tools), github.* (read-only), operations.* (server tools).",
      "Use codemode.search() and codemode.describe() to discover connector methods.",
      "Use browser_codemode for browser-owned tools.",
    ].join(" ");
  }

  #executeRuntime: ExecuteRuntime | null = null;
  #githubConfigurationWarningLogged = false;

  private executeRuntime(): ExecuteRuntime {
    if (this.#executeRuntime) return this.#executeRuntime;

    const connectors = [];
    if (this.env.GITHUB_TOKEN) {
      connectors.push(
        new GithubConnector(this.ctx, this.env, this.env.GITHUB_TOKEN),
      );
    } else if (!this.#githubConfigurationWarningLogged) {
      console.warn("GITHUB_TOKEN is not configured; GitHub tools are disabled.");
      this.#githubConfigurationWarningLogged = true;
    }

    // ToolSetConnector: exposes AI SDK tools as operations.*
    connectors.push(
      toolSetConnector(this.ctx, {
        name: "workspace",
        instructions: "Tools for the current user's workspace.",
        tools: codemodeWorkspaceTools(createAITools({ workspace: this.workspace })),
      }),
      toolSetConnector(this.ctx, {
        name: "operations",
        instructions: "Server-side utility tools.",
        tools: operationsTools,
      }),
    );

    this.#executeRuntime = createExecuteRuntime(this, {
      name: "default",
      connectors,
      globalOutbound: null,
    });

    return this.#executeRuntime;
  }

  getTools() {
    return {
      codemode: this.executeRuntime().tool,
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
