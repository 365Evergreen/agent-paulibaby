export {};

declare global {
  interface Env {
    CF_ACCESS_TEAM_DOMAIN?: string;
    CF_ACCESS_AUD?: string;
    CF_ACCESS_ALLOWED_GROUP_IDS?: string;
    LEGACY_STATE_OWNER_SUBJECT?: string;
    GITHUB_TOKEN?: string;
    API_BASE_URL?: string;
    API_TOKEN?: string;
    MCP_ALLOWED_ORIGINS?: string;
  }
}
