import { Think } from "@cloudflare/think";
import { Workspace } from "@cloudflare/computer";
import { CodeMode }
import { WorkerJavaScriptBackend } from "@cloudflare/computer/backends/worker-javascript";
import { createAI } from "agents/models/ai-sdk";
import { routeAgentRequest } from "agents";
import type { Env } from "@mistralai/mistralai/lib/env.js";

// Same model the existing OpenCodeAgent uses.
const MODEL_ID = "@cf/moonshotai/kimi-k2.7-code";

/**
 * Top-level Think agent with workspace file tools.
 *
 * Think automatically provides these built-in workspace tools on every turn:
 *   read, ls, find, grep, write, edit, delete
 *
 * Adding a WorkerJavaScriptBackend also enables `exec` — the model can write
 * and run JavaScript against workspace files in a Dynamic Worker.
 *
 * Connect from a browser with `useAgentChat` from `@cloudflare/ai-chat/react`.
 */
export class PaulibabyAgent extends Think<Env> {
  // Override the default workspace to add a JavaScript execution backend.
  // The LOADER worker_loader binding powers the Dynamic Worker for `exec`.
  override workspace = new Workspace({
    storage: this.ctx.storage,
    backends: [
      new WorkerJavaScriptBackend({
        id: "js",
        loader: (this.env as any).LOADER,
        access: "read-write",
      }),
    ],
  });

  getModel() {
    const ai = createAI({ binding: this.env.AI});
    return ai(MODEL_ID, { reasoningEffort: "low" });
  }

  getSystemPrompt() {
    return "You are a helpful assistant with access to a workspace filesystem. You can read, list, find, grep, write, edit, and delete files, and run JavaScript with exec. Use these tools when the user asks you to work with files or code.";
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
