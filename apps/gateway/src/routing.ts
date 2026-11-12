export function tenantAgentRequest(
  request: Request,
  instanceName: string,
): Request | null {
  const url = new URL(request.url);
  const segments = url.pathname.split("/");
  if (
    segments.length !== 4 ||
    segments[1] !== "agents" ||
    !["paulibaby-agent", "PaulibabyAgent"].includes(segments[2]) ||
    !segments[3]
  ) {
    return null;
  }

  segments[3] = instanceName;
  url.pathname = segments.join("/");
  return new Request(url, request);
}
