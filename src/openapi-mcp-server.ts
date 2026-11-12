import { openApiMcpServer } from "@cloudflare/codemode/mcp";
import { DynamicWorkerExecutor } from "@cloudflare/codemode";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

/**
 * Code Mode MCP server from an OpenAPI spec.
 *
 * Creates an MCP server with two tools:
 *   - search: runs code against the OpenAPI document (local $ref resolved)
 *   - execute: runs code that can inspect the document and call the
 *     host-provided request function
 *
 * The host request function keeps credentials outside the sandbox. Text
 * responses are limited to ~6,000 tokens with a truncation marker.
 *
 * Any MCP client can connect at:
 *   https://<YOUR_WORKER>.<YOUR_SUBDOMAIN>.workers.dev/mcp
 */

// ── Example OpenAPI spec ──────────────────────────────────────────────────────
// Replace with your own spec (load from a file, R2, or an external URL).

const exampleSpec = {
  openapi: "3.0.0",
  info: { title: "Example API", version: "1.0.0" },
  paths: {
    "/items": {
      get: {
        operationId: "listItems",
        summary: "List all items",
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "A list of items",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/items/{id}": {
      get: {
        operationId: "getItem",
        summary: "Get a single item by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
        responses: {
          "200": {
            description: "A single item",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

// ── Host request function ────────────────────────────────────────────────────
// Keeps credentials and base URLs out of the sandbox. The model calls
// codemode.request({ method, path, query, body }) from generated code.

async function hostRequest(options: {
  method: string;
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  contentType?: string;
}): Promise<unknown> {
  const baseUrl = "https://api.example.com";
  const url = new URL(`${baseUrl}${options.path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const headers = new Headers();
  // Add auth headers here — the model never sees these
  headers.set("Authorization", "Bearer YOUR_API_TOKEN");
  if (options.contentType) headers.set("Content-Type", options.contentType);

  const response = await fetch(url.toString(), {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return response.json();
}

// ── Worker entry point ────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("Code Mode OpenAPI MCP server running. Connect at /mcp", {
        status: 200,
      });
    }

    if (url.pathname !== "/mcp") {
      return new Response("Not found", { status: 404 });
    }

    const executor = new DynamicWorkerExecutor({ loader: env.LOADER });

    const server = openApiMcpServer({
      spec: exampleSpec,
      executor,
      request: hostRequest,
      name: "example-api",
      version: "1.0.0",
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);

    return transport.handleRequest(request);
  },
} satisfies ExportedHandler<Env>;
