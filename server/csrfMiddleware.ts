import type { FastifyReply, FastifyRequest } from "fastify";
import type { SessionStore } from "./sessionStore";
import type { EnvConfig } from "./env";

const CSRF_HEADER = "x-csrf-token";

export type CsrfContext = {
  csrfToken: string;
};

type CsrfMiddlewareOptions = {
  sessionStore: SessionStore;
  env: EnvConfig;
};

export function createCsrfMiddleware({ sessionStore, env }: CsrfMiddlewareOptions) {
  return async function requireCsrf(request: FastifyRequest, reply: FastifyReply) {
    const method = request.method.toUpperCase();
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
      return;
    }

    const sessionId = request.cookies?.[env.adminCookieName];
    if (!sessionId || typeof sessionId !== "string") {
      return void reply.status(401).send({ error: "Unauthorized" });
    }

    const session = await sessionStore.getSession(sessionId);
    if (!session) {
      return void reply.status(401).send({ error: "Unauthorized" });
    }

    const headerToken = request.headers[CSRF_HEADER] as string | undefined;
    if (headerToken && headerToken === session.csrfToken) {
      return;
    }

    // Fallback: ensure same-site requests by validating Origin against the allowlist.
    // SameSite=Strict is enforced at the cookie level via the session cookie options.
    if (validateOrigin(request, env)) {
      return;
    }

    return void reply.status(403).send({ error: "Invalid CSRF token" });
  };
}

export function validateOrigin(request: FastifyRequest, env: EnvConfig) {
  const origin = request.headers.origin;
  if (!origin || typeof origin !== "string") return false;

  return env.corsOrigins.includes(origin);
}
