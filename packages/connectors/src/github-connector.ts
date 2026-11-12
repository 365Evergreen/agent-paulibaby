import { McpConnector, type ConnectorTool, type McpConnectionLike } from "@cloudflare/codemode";

/**
 * MCP connector for a GitHub MCP server.
 *
 * Exposes all GitHub MCP tools as `github.*` methods inside generated code.
 * The `create_issue` tool is marked `requiresApproval: true` so the durable
 * runtime pauses execution and returns a pending approval before it runs.
 *
 * Register the GitHub MCP server in wrangler.jsonc under "mcp" or via
 * this.mcp.addServer() in the agent's onConnect lifecycle method.
 */
export class GithubConnector extends McpConnector<unknown> {
  private connection: McpConnectionLike;

  constructor(ctx: DurableObjectState, env: unknown, connection: McpConnectionLike) {
    super(ctx, env);
    this.connection = connection;
  }

  override name(): string {
    return "github";
  }

  protected override createConnection(): McpConnectionLike {
    return this.connection;
  }

  /**
   * Intercept tool definitions to add approval gating.
   * The model can still call github.create_issue(), but the runtime
   * pauses before executing it and returns a pending approval.
   */
  protected override tool(name: string, tool: ConnectorTool): ConnectorTool {
    if (name === "create_issue") {
      return { ...tool, requiresApproval: true };
    }
    return tool;
  }
}
