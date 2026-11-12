import { createRemoteJWKSet, errors, jwtVerify } from "jose";

export interface AccessEnvironment {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_ALLOWED_GROUP_IDS?: string;
}

export interface AccessPrincipal {
  issuer: string;
  audience: string;
  subject: string;
}

export type AccessCheck =
  | { ok: true; principal: AccessPrincipal }
  | {
      ok: false;
      status: 401 | 403 | 503;
      code: string;
      message: string;
      retryable: boolean;
    };

type Jwks = ReturnType<typeof createRemoteJWKSet>;
type JwksResolver = (issuer: string) => Jwks;

const jwksCache = new Map<string, Jwks>();
const teamDomainPattern =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.cloudflareaccess\.com$/;

function remoteJwks(issuer: string): Jwks {
  let jwks = jwksCache.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", issuer));
    jwksCache.set(issuer, jwks);
  }
  return jwks;
}

export async function authenticateAccessRequest(
  request: Request,
  env: AccessEnvironment,
  resolveJwks: JwksResolver = remoteJwks,
): Promise<AccessCheck> {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim().toLowerCase();
  const audience = env.CF_ACCESS_AUD?.trim();
  const allowedGroups = new Set(
    env.CF_ACCESS_ALLOWED_GROUP_IDS?.split(",")
      .map((group) => group.trim())
      .filter(Boolean) ?? [],
  );

  if (!teamDomainPattern.test(teamDomain ?? "") || !audience || !allowedGroups.size) {
    return {
      ok: false,
      status: 503,
      code: "access_not_configured",
      message: "Cloudflare Access is not configured for this service.",
      retryable: false,
    };
  }

  const assertion = request.headers.get("cf-access-jwt-assertion");
  if (!assertion) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      message: "A valid Cloudflare Access identity is required.",
      retryable: false,
    };
  }

  const issuer = `https://${teamDomain}`;
  let payload;
  try {
    ({ payload } = await jwtVerify(assertion, resolveJwks(issuer), {
      issuer,
      audience,
    }));
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      return {
        ok: false,
        status: 401,
        code: "unauthorized",
        message: "A valid Cloudflare Access identity is required.",
        retryable: false,
      };
    }
    console.error("Cloudflare Access verification could not complete.", error);
    return {
      ok: false,
      status: 503,
      code: "access_verification_unavailable",
      message: "Cloudflare Access verification is temporarily unavailable.",
      retryable: true,
    };
  }

  if (typeof payload.sub !== "string" || payload.sub.length === 0) {
    return {
      ok: false,
      status: 401,
      code: "unauthorized",
      message: "A valid Cloudflare Access identity is required.",
      retryable: false,
    };
  }

  const groups = payload.groups;
  if (
    !Array.isArray(groups) ||
    !groups.some((group) => typeof group === "string" && allowedGroups.has(group))
  ) {
    return {
      ok: false,
      status: 403,
      code: "forbidden",
      message: "Your Cloudflare Access identity is not authorized for this service.",
      retryable: false,
    };
  }

  return {
    ok: true,
    principal: { issuer, audience, subject: payload.sub },
  };
}

export async function agentInstanceNameFor(
  principal: AccessPrincipal,
  legacyStateOwnerSubject?: string,
): Promise<string> {
  if (legacyStateOwnerSubject && principal.subject === legacyStateOwnerSubject) {
    return "default";
  }

  const identity = `${principal.issuer}\n${principal.audience}\n${principal.subject}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(identity),
  );
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `user-${hex}`;
}

export function accessErrorResponse(
  result: Extract<AccessCheck, { ok: false }>,
): Response {
  return Response.json(
    {
      error: {
        code: result.code,
        message: result.message,
        retryable: result.retryable,
      },
    },
    { status: result.status },
  );
}

export function isAllowedOrigin(
  request: Request,
  allowedOrigins: string | undefined,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  return new Set(
    allowedOrigins?.split(",").map((value) => value.trim()).filter(Boolean) ?? [],
  ).has(origin);
}
