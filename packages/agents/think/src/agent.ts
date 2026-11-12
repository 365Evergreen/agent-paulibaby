import { Think } from "@cloudflare/think";
import { Workspace } from "@cloudflare/computer";
import { WorkerJavaScriptBackend } from "@cloudflare/computer/backends/worker-javascript";
import { createAITools } from "@cloudflare/computer/tools/ai-sdk";
import {
  createCodemodeRuntime,
  DynamicWorkerExecutor,
  type CodemodeRuntimeHandle,
} from "@cloudflare/codemode";
import { toolSetConnector } from "@cloudflare/codemode/ai";
import { createAI } from "agents/models/ai-sdk";
import { callable, routeAgentRequest } from "agents";
import { tool } from "ai";
import { z } from "zod";
import { GithubConnector } from "@agent-paulibaby/connectors";

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
 *   - MCP connector (GitHub, with approval-gated create_issue)
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
        loader: this.env.LOADER,
        access: "read-write",
      }),
    ],
  });

  // MCP tools are exposed through the Code Mode connector, not Think's
  // automatic tool set.
  includeMcpTools = false;

  getModel() {
    return createAI({ binding: this.env.AI })(MODEL_ID, { reasoningEffort: "low" });
  }

  getSystemPrompt() {
    return [
      "You are a helpful assistant with workspace file tools, Code Mode, and connectors.",
      "Workspace tools: read, ls, find, grep, write, edit, delete, exec.",
      "Code Mode: write one JS function that orchestrates multiple tools in a single block.",
      "GitHub tools require the GITHUB_TOKEN Worker secret; all tools not explicitly classified as read-only require user approval.",
      "Connectors: github.* (approval-gated mutations), operations.* (server tools).",
      "Use codemode.search() and codemode.describe() to discover connector methods.",
    ].join(" ");
  }

  #runtime: CodemodeRuntimeHandle | null = null;
  #githubConfigurationWarningLogged = false;

  async codemodeRuntime(): Promise<CodemodeRuntimeHandle> {
    if (this.#runtime) return this.#runtime;

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
        name: "operations",
        instructions: "Server-side utility tools.",
        tools: operationsTools,
      }),
    );

    this.#runtime = createCodemodeRuntime({
      ctx: this.ctx,
      executor: new DynamicWorkerExecutor({ loader: this.env.LOADER }),
      connectors,
    });

    return this.#runtime;
  }

  getTools() {
    return {
      codemode: this.codemodeRuntime().then((rt) =>
        rt.tool({
          tools: [
            {
              name: "workspace",
              tools: createAITools({ workspace: this.workspace }),
            },
          ],
        }),
      ),
    };
  }

  // ── Human-in-the-loop approval methods (called from the client) ─────────────

  @callable()
  async pendingApprovals() {
    const rt = await this.codemodeRuntime();
    return rt.pending();
  }

  @callable()
  async approveExecution(executionId: string) {
    const rt = await this.codemodeRuntime();
    return rt.approve({ executionId });
  }

  @callable()
  async rejectExecution(executionId: string, seq: number) {
    const rt = await this.codemodeRuntime();
    return rt.reject({ executionId, seq });
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
