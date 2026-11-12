import type { McpConnectionLike } from "@cloudflare/codemode";

const READ_ONLY_GITHUB_TOOLS = new Set([
  "get_commit",
  "get_file_contents",
  "get_label",
  "get_latest_release",
  "get_me",
  "get_release_by_tag",
  "get_tag",
  "get_team_members",
  "get_teams",
  "issue_read",
  "list_branches",
  "list_commits",
  "list_issue_fields",
  "list_issue_types",
  "list_issues",
  "list_pull_requests",
  "list_releases",
  "list_repository_collaborators",
  "list_tags",
  "pull_request_read",
  "search_code",
  "search_commits",
  "search_issues",
  "search_pull_requests",
  "search_repositories",
  "search_users",
]);

export function githubToolRequiresApproval(name: string): boolean {
  return !READ_ONLY_GITHUB_TOOLS.has(name);
}

export function assertGithubReadOnlyTool(name: string): void {
  if (githubToolRequiresApproval(name)) {
    throw new Error(`GitHub tool "${name}" is disabled until mutation approvals are verified.`);
  }
}

export function restrictGithubConnection(connection: McpConnectionLike): McpConnectionLike {
  const filter = <T extends { name: string }>(tools: T[]) =>
    tools.filter((tool) => !githubToolRequiresApproval(tool.name));
  const fetchTools = connection.fetchTools;
  return {
    ...connection,
    tools: connection.tools ? filter(connection.tools) : undefined,
    fetchTools: fetchTools
      ? async () => filter(await fetchTools.call(connection))
      : undefined,
    client: {
      callTool: (params) => {
        assertGithubReadOnlyTool(params.name);
        return connection.client.callTool(params);
      },
    },
  };
}
