import { McpConnector, type ConnectorTool, type McpConnectionLike } from "@cloudflare/codemode";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { githubToolRequiresApproval } from "./github-approval-policy";

/**
 * MCP connector for a GitHub MCP server.
 *
 * Exposes all GitHub MCP tools as `github.*` methods inside generated code.
 * The bearer token is supplied at runtime and is never stored in the Agent's
 * Durable Object state by the MCP manager.
 */
export class GithubConnector extends McpConnector<unknown> {
  private readonly token: string;

  constructor(
    ctx: DurableObjectState,
    env: unknown,
    token: string,
  ) {
    super(ctx, env);
    this.token = token;
  }

  override name(): string {
    return "github";
  }

  protected override async createConnection(): Promise<McpConnectionLike> {
    const client = new Client({
      name: "agent-paulibaby-github",
      version: "0.0.1",
    });
    const transport = new StreamableHTTPClientTransport(
      new URL("https://api.githubcopilot.com/mcp/"),
      {
        requestInit: {
          headers: { Authorization: `Bearer ${this.token}` },
        },
      },
    );
    await client.connect(transport);
    const { tools } = await client.listTools();

    return {
      name: "github",
      tools,
      client: {
        callTool: ({ name, arguments: args }) =>
          client.callTool({ name, arguments: args }),
      },
    };
  }

  protected override tool(name: string, tool: ConnectorTool): ConnectorTool {
    return githubToolRequiresApproval(name)
      ? { ...tool, requiresApproval: true }
      : tool;
  }
}
