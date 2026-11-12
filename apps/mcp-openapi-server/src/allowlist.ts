export function isAllowedOpenApiRequest(
  method: string,
  path: string,
  pathTemplates: string[],
): boolean {
  if (
    method.toUpperCase() !== "GET" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    /(^|\/)\.{1,2}(?:\/|$)/.test(path)
  ) {
    return false;
  }

  return pathTemplates.some((template) => {
    const matcher = new RegExp(
      `^${template
        .split("/")
        .map((segment) =>
          segment.startsWith("{") && segment.endsWith("}")
            ? "[^/]+"
            : segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        )
        .join("/")}$`,
    );
    return matcher.test(path);
  });
}

export function apiRequestUrl(baseUrl: string, path: string): URL {
  const base = new URL(baseUrl);
  if (
    base.protocol !== "https:" ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    base.username ||
    base.password
  ) {
    throw new Error("API_BASE_URL must be an HTTPS origin without a path or credentials.");
  }

  const url = new URL(path, base);
  if (url.origin !== base.origin) {
    throw new Error("The requested API path is outside the configured API origin.");
  }
  return url;
}
