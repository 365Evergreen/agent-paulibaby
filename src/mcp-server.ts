import { codeMcpServer } from "@cloudflare/codemode/mcp";
import { DynamicWorkerExecutor } from "@cloudflare/codemode";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

/**
 * Code Mode MCP server — wraps an existing MCP server with a single `code` tool.
 *
 * Instead of advertising each upstream tool separately, this server exposes one
 * `code` tool. The tool description contains generated TypeScript definitions
 * for every upstream tool. The model writes JavaScript against a `codemode`
 * namespace and the code runs in an isolated Dynamic Worker.
 *
 * Any MCP client can connect at:
 *   https://<YOUR_WORKER>.<YOUR_SUBDOMAIN>.workers.dev/mcp
 *
 * The model sees typed methods like:
 *   codemode.get_server_time()
 *   codemode.echo({ text: "hello" })
 *   codemode.list_items({ limit: 10 })
 */

// ── Upstream MCP server with example tools ───────────────────────────────────
// Replace these with your real tools. Each tool becomes a typed codemode.*
// method the model can call from generated code.

function createUpstreamServer() {
  const server = new McpServer({
    name: "paulibaby-tools",
    version: "1.0.0",
  });

  server.tool(
    "get_server_time",
    "Get the current server time in ISO format",
    {},
    async () => ({
      content: [{ type: "text", text: JSON.stringify({ time: new Date().toISOString() }) }],
    }),
  );

  server.tool(
    "echo",
    "Echo back the provided text",
    { text: z.string().describe("Text to echo back") },
    async ({ text }) => ({
      content: [{ type: "text", text: JSON.stringify({ echoed: text }) }],
    }),
  );

  server.tool(
    "list_items",
    "List items with an optional limit",
    { limit: z.number().optional().describe("Max items to return (default 10)") },
    async ({ limit }) => {
      const items = Array.from({ length: limit ?? 10 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));
      return {
        content: [{ type: "text", text: JSON.stringify(items) }],
      };
    },
  );

  return server;
}

// ── Worker entry point ────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/") {
      return new Response("Code Mode MCP server running. Connect at /mcp", {
        status: 200,
      });
    }

    if (url.pathname !== "/mcp") {
      return new Response("Not found", { status: 404 });
    }

    // Create the upstream server with your tools
    const upstream = createUpstreamServer();

    // Wrap it with Code Mode — all upstream tools become codemode.* methods
    const executor = new DynamicWorkerExecutor({ loader: env.LOADER });
    const server = await codeMcpServer({
      server: upstream,
      executor,
      // Optional: custom description with placeholders
      // description: "Write JavaScript that calls {{types}}\n\nExample: {{example}}",
    });

    // Serve over the MCP streamable HTTP transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });

    await server.connect(transport);

    return transport.handleRequest(request);
  },
} satisfies ExportedHandler<Env>;
