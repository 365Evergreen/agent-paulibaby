import { routeAgentRequest } from "agents";
import type { ApiErrorResponse } from "@agent-paulibaby/contracts";

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
    return (
      (await routeAgentRequest(request, env)) ??
      Response.json(notFoundError, { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
