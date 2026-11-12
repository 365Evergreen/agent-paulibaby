import { routeAgentRequest } from "agents";
import type { ApiErrorResponse } from "@agent-paulibaby/contracts";
import {
  accessErrorResponse,
  agentInstanceNameFor,
  authenticateAccessRequest,
} from "@agent-paulibaby/auth";
import { tenantAgentRequest } from "./routing";

export { CodemodeRuntime, PaulibabyAgent } from "@agent-paulibaby/think";

const notFoundError = {
  error: {
    code: "not_found",
    message: "Not found",
    retryable: false,
  },
} satisfies ApiErrorResponse;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const access = await authenticateAccessRequest(request, env);
    if (!access.ok) return accessErrorResponse(access);

    const instanceName = await agentInstanceNameFor(
      access.principal,
      env.LEGACY_STATE_OWNER_SUBJECT,
    );
    const tenantRequest = tenantAgentRequest(request, instanceName);
    if (!tenantRequest) return Response.json(notFoundError, { status: 404 });
    return (
      (await routeAgentRequest(tenantRequest, env)) ??
      Response.json(notFoundError, { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
